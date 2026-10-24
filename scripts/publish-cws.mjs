// Uploads a zip to the Chrome Web Store and submits it for review, using the
// v2 API and a service account (no OAuth refresh token to expire).
//
// Usage: node scripts/publish-cws.mjs <zip>
// Env:   CWS_SERVICE_ACCOUNT_KEY  service account JSON key (the whole file)
//        CWS_PUBLISHER_ID         Developer Dashboard > Account > Publisher ID
//        CWS_EXTENSION_ID         the item ID from the store URL
//        CWS_PUBLISH_TYPE         optional: DEFAULT_PUBLISH (default) or STAGED_PUBLISH
import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const API = 'https://chromewebstore.googleapis.com';
const SCOPE = 'https://www.googleapis.com/auth/chromewebstore';

const zipPath = process.argv[2];
const { CWS_SERVICE_ACCOUNT_KEY, CWS_PUBLISHER_ID, CWS_EXTENSION_ID } = process.env;
const publishType = process.env.CWS_PUBLISH_TYPE || 'DEFAULT_PUBLISH';

if (!zipPath || !CWS_SERVICE_ACCOUNT_KEY || !CWS_PUBLISHER_ID || !CWS_EXTENSION_ID) {
  console.error('Usage: node scripts/publish-cws.mjs <zip>, with CWS_SERVICE_ACCOUNT_KEY, CWS_PUBLISHER_ID and CWS_EXTENSION_ID set');
  process.exit(1);
}

const item = `${API}/v2/publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}`;
const uploadUrl = `${API}/upload/v2/publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}:upload`;

const base64url = (data) => Buffer.from(data).toString('base64url');

// Signs a JWT with the service account's private key and trades it for an
// access token (https://developers.google.com/identity/protocols/oauth2/service-account#httprest).
async function getAccessToken() {
  const key = JSON.parse(CWS_SERVICE_ACCOUNT_KEY);
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: key.client_email,
    scope: SCOPE,
    aud: key.token_uri,
    iat: now,
    exp: now + 3600,
  }));
  const signature = createSign('RSA-SHA256').update(`${header}.${claims}`).sign(key.private_key, 'base64url');

  const res = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(body)}`);
  return body.access_token;
}

async function call(token, method, url, { json, data } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (json) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method, headers, body: json ? JSON.stringify(json) : data });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : {};
}

const token = await getAccessToken();

console.log(`Uploading ${zipPath}...`);
const upload = await call(token, 'POST', uploadUrl, { data: await readFile(zipPath) });
let state = upload.uploadState;

// Large packages are processed asynchronously. The upload docs call the
// pending state UPLOAD_IN_PROGRESS while the UploadState enum says IN_PROGRESS.
for (let i = 0; i < 30 && (state === 'IN_PROGRESS' || state === 'UPLOAD_IN_PROGRESS'); i++) {
  await new Promise((r) => setTimeout(r, 10_000));
  state = (await call(token, 'GET', `${item}:fetchStatus`)).lastAsyncUploadState;
  console.log(`  upload state: ${state}`);
}
if (state !== 'SUCCEEDED') throw new Error(`Upload did not succeed: ${JSON.stringify(upload)} (last state ${state})`);
console.log(`Uploaded version ${upload.crxVersion ?? '(processed async)'}`);

console.log(`Submitting for review (${publishType})...`);
const published = await call(token, 'POST', `${item}:publish`, { json: { publishType } });
console.log(`Submission state: ${published.state}`);
if (published.warningInfo) console.log(`Warnings: ${JSON.stringify(published.warningInfo)}`);
