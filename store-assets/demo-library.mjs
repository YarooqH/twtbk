// The demo library written into the dashboard's database. Parody accounts, not
// real people. `av` names a photo in fixtures/avatars/, `image`/`video` a drawing
// in fixtures/assets.html; capture.mjs turns them into data URIs so the
// dashboard shows them without any network.

export const CATEGORIES = [
  { id: 'cat_memes', name: 'Memes', color: '#ffd400' },
  { id: 'cat_dev', name: 'Dev', color: '#1d9bf0' },
  { id: 'cat_design', name: 'Design', color: '#f91880' },
  { id: 'cat_recipes', name: 'Recipes', color: '#00ba7c' },
  { id: 'cat_later', name: 'Read later (lol)', color: '#ff7a00' },
];

// Newest first; `ago` is hours since it was saved.
export const POSTS = [
  { h: 'heehee_official', n: 'definitely not MJ', av: 'av-mj', t: 'hehe',
    c: 'cat_memes', tags: ['iconic'], note: 'my reply to every email from now on', ago: 1 },
  { h: 'eggo_enjoyer', n: '011', av: 'av-eleven', t: 'Mike.',
    c: 'cat_memes', tags: [], note: 'friends don’t lie', ago: 3 },
  { h: 'onedoesnotsimply', n: 'one does not simply', av: 'av-ring', t: 'one does not simply merge to main on a friday',
    quoted: { h: 'rubberduckdev', n: 'rubber duck (senior engineer)', av: 'av-duck', t: 'the only function I’ve never shipped a bug in', image: 'img-code' },
    c: 'cat_dev', tags: ['git'], note: 'print this and hang it in the office', ago: 4 },
  { h: 'anyone_can_cook', n: 'not Remy (rat, chef)', av: 'av-remy', t: 'anyone can cook. 72 hours of proofing, 42 seconds of video. please do not tell the health inspector',
    video: 'img-focaccia', c: 'cat_recipes', tags: ['bread'], note: 'making this sunday (for real this time)', ago: 6 },
  { h: 'kowalski_analysis', n: 'Kowalski (analysis)', av: 'av-kowalski', t: 'skipper asked for an analysis of our bookmark habits. it’s not good, skipper',
    image: 'img-chart', c: 'cat_memes', tags: ['relatable'], note: 'sending this to my therapist', ago: 8 },
  { h: 'much_bookmark', n: 'doge', av: 'av-doge', t: 'such tier list. very ranking. wow',
    image: 'img-tier', c: 'cat_memes', tags: [], note: 'S tier is literally this extension', ago: 10 },
  { h: 'fine_actually', n: 'this is fine', av: 'av-fine', t: 'my bookmarks: expectation vs reality.\neverything is fine',
    image: 'img-evr', c: 'cat_design', tags: [], ago: 13 },
  { h: 'hawkins_power_co', n: 'Hawkins Power & Light', av: 'av-hawkins', t: 'we are aware of the lights flickering on Maple St again. we checked the wiring. the wiring is fine. please stop calling',
    c: 'cat_later', tags: ['spooky'], ago: 18 },
  { h: 'rubberduckdev', n: 'rubber duck (senior engineer)', av: 'av-duck', t: 'explained my bug to a rubber duck for 20 minutes. the duck has now been promoted to senior engineer',
    c: 'cat_dev', tags: ['debugging'], ago: 20 },
  { h: 'pivot_pivot_pivot', n: 'Ross (pivot enthusiast)', av: 'av-ross', t: 'moving my bookmarks into new folders.\nPIVOT. PIVOT. PIVOOOT.',
    c: 'cat_design', tags: [], ago: 26 },
  { h: 'om_nom_nom', n: 'cookie enjoyer', av: 'av-cookie', t: 'nobody:\nme at 2am: *bookmarks a 47-part thread on medieval bread*\nme 6 months later: has not baked the bread. has eaten many cookies',
    c: 'cat_memes', tags: ['bread', 'relatable'], note: 'me. this is me.', ago: 30 },
  { h: 'kevins_famous_chili', n: 'Kevin’s famous chili', av: 'av-kevin', t: 'the trick is to undercook the onions. bookmarking this so I never spill it again',
    c: 'cat_recipes', tags: [], ago: 41 },
  { h: 'get_out_me_swamp', n: 'ogre (layers)', av: 'av-shrek', t: 'my bookmarks are like onions. they have layers. and they make me cry',
    c: 'cat_memes', tags: [], ago: 55 },
  { h: 'same_picture_pam', n: 'Pam from reception', av: 'av-pam', t: 'corporate needs you to find the differences between “saved” and “read”.\n\nthey’re the same picture.',
    c: 'cat_design', tags: [], ago: 70 },
  { h: 'mochi_commits', n: 'Mochi (cat)', av: 'av-cat', t: 'walked across the keyboard and fixed the flaky test. no notes. treats accepted',
    c: 'cat_dev', tags: [], note: 'hire this cat', ago: 96 },
  { h: 'snapped_folders', n: 'perfectly balanced', av: 'av-thanos', t: 'snapped my fingers and half my bookmarks are gone. perfectly balanced, as all things should be',
    c: null, tags: [], ago: 130 },
  { h: 'onedoesnotsimply', n: 'one does not simply', av: 'av-ring', t: 'one does not simply read a bookmarked thread',
    c: 'cat_later', tags: [], ago: 180 },
  { h: 'no_soup_for_you', n: 'soup guy', av: 'av-soup', t: 'NO SOUP FOR YOU. unless you bookmarked the recipe',
    c: 'cat_recipes', tags: [], ago: 240 },
  { h: 'anyone_can_cook', n: 'not Remy (rat, chef)', av: 'av-remy', t: 'if your focaccia doesn’t look like a golf course from above, keep going',
    c: 'cat_recipes', tags: ['bread'], ago: 300 },
];

const HOUR = 3600e3;

/** Build the IndexedDB rows. `art(name)` returns a data URI for a drawing. */
export function demoLibrary(now, art) {
  const categories = CATEGORIES.map((c, i) => ({ ...c, createdAt: now - (400 - i) * HOUR, sortOrder: i }));
  const bookmarks = POSTS.map((p, i) => {
    const id = String(1839100000000000000n + BigInt(i + 1));
    const media = [];
    if (p.image) media.push({ type: 'image', url: art(p.image) });
    if (p.video) media.push({ type: 'video', url: art(p.video), previewUrl: art(p.video) });
    return {
      id,
      tweetUrl: `https://x.com/${p.h}/status/${id}`,
      authorHandle: p.h,
      authorName: p.n,
      authorAvatarUrl: art(p.av),
      text: p.t,
      createdAt: now - (p.ago + 2) * HOUR,
      savedAt: now - p.ago * HOUR,
      categoryIds: p.c ? [p.c] : [],
      tags: p.tags,
      note: p.note,
      media,
      quotedTweet: p.quoted
        ? { authorHandle: p.quoted.h, authorName: p.quoted.n, authorAvatarUrl: art(p.quoted.av), text: p.quoted.t, media: p.quoted.image ? [{ type: 'image', url: art(p.quoted.image) }] : [] }
        : undefined,
      source: 'extension',
    };
  });
  return { categories, bookmarks };
}
