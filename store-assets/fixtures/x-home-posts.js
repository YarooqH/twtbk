// Demo timeline for fixtures/x-home.html. Parody accounts, not real people. Post
// images are drawn in fixtures/assets.html, avatars are public-domain photos in
// fixtures/avatars/; capture.mjs serves both at pbs.twimg.com URLs.
(() => {
  const AV = (name) => `https://pbs.twimg.com/profile_images/${name}.png`;
  const IMG = (name) => `https://pbs.twimg.com/media/${name}.png`;

  const posts = [
    { id: '1839200000000000001', name: 'definitely not MJ', handle: 'heehee_official', av: 'av-mj', verified: true, ago: '2h',
      text: 'hehe', n: ['8.1K', '61K', '402K', '12M'] },
    { id: '1839200000000000002', name: '011', handle: 'eggo_enjoyer', av: 'av-eleven', ago: '3h',
      text: 'Mike.', n: ['2.3K', '19K', '188K', '4.4M'] },
    { id: '1839200000000000003', name: 'one does not simply', handle: 'onedoesnotsimply', av: 'av-ring', ago: '4h',
      text: 'one does not simply merge to main on a friday',
      quote: { name: 'rubber duck (senior engineer)', handle: 'rubberduckdev', av: 'av-duck', text: 'the only function I’ve never shipped a bug in', image: 'img-code' },
      n: ['1.1K', '4.6K', '31K', '2.4M'] },
    { id: '1839200000000000004', name: 'not Remy (rat, chef)', handle: 'anyone_can_cook', av: 'av-remy', ago: '5h',
      text: 'anyone can cook. 72 hours of proofing, 42 seconds of video. please do not tell the health inspector',
      video: 'img-focaccia', duration: '0:42', n: ['286', '1.9K', '12K', '640K'] },
    { id: '1839200000000000005', name: 'Kowalski (analysis)', handle: 'kowalski_analysis', av: 'av-kowalski', verified: true, ago: '7h',
      text: 'skipper asked for an analysis of our bookmark habits. it’s not good, skipper',
      image: 'img-chart', n: ['412', '2.8K', '19K', '1.2M'] },
    { id: '1839200000000000006', name: 'doge', handle: 'much_bookmark', av: 'av-doge', ago: '9h',
      text: 'such tier list. very ranking. wow',
      image: 'img-tier', n: ['932', '3.1K', '22K', '1.6M'] },
    { id: '1839200000000000007', name: 'this is fine', handle: 'fine_actually', av: 'av-fine', ago: '12h',
      text: 'my bookmarks: expectation vs reality.\neverything is fine',
      image: 'img-evr', n: ['318', '2.2K', '17K', '880K'] },
  ];

  const badge = '<svg class="verified" viewBox="0 0 24 24" aria-label="Verified account"><path fill="currentColor" d="M12 2l2.4 2.2 3.2-.5.9 3.1 2.9 1.5-1.2 3 1.2 3-2.9 1.5-.9 3.1-3.2-.5L12 22l-2.4-2.2-3.2.5-.9-3.1-2.9-1.5 1.2-3-1.2-3 2.9-1.5.9-3.1 3.2.5z"/><path d="M8 12.2l2.6 2.6L16.2 9" fill="none" stroke="#fff" stroke-width="2"/></svg>';

  const mediaHtml = (p, statusUrl) => {
    if (p.image) {
      return `<div class="media"><a href="${statusUrl}/photo/1"><div data-testid="tweetPhoto"><img alt="Image" src="${IMG(p.image)}"></div></a></div>`;
    }
    if (p.video) {
      return `<div class="media" data-testid="videoPlayer"><video poster="${IMG(p.video)}" preload="none"></video><div class="play"></div><div class="duration">${p.duration}</div></div>`;
    }
    return '';
  };

  const feed = document.getElementById('feed');
  const tpl = document.getElementById('post');
  for (const p of posts) {
    const el = tpl.content.firstElementChild.cloneNode(true);
    const statusUrl = `/${p.handle}/status/${p.id}`;
    el.querySelector('.avatar').src = AV(p.av);
    el.querySelector('.name').textContent = p.name;
    el.querySelector('.name').href = '/' + p.handle;
    if (p.verified) el.querySelector('.name').insertAdjacentHTML('afterend', badge);
    el.querySelector('.handle').textContent = '@' + p.handle;
    el.querySelector('.handle').href = '/' + p.handle;
    el.querySelector('.status').href = statusUrl;
    el.querySelector('time').textContent = p.ago;
    el.querySelector('time').setAttribute('datetime', new Date(Date.now() - parseInt(p.ago) * 3600e3).toISOString());
    el.querySelector('[data-testid="tweetText"] span').textContent = p.text;
    el.querySelector('.views').href = statusUrl + '/analytics';
    let slot = mediaHtml(p, statusUrl);
    if (p.quote) {
      const q = p.quote;
      slot += `<div class="quote" data-testid="quoteTweet" role="link" tabindex="0">
        <div class="qhead" data-testid="User-Name"><img class="qav" alt="" src="${AV(q.av)}"><span class="name">${q.name}</span><span class="meta">@${q.handle} · 1d</span></div>
        <div class="qtext" data-testid="tweetText" lang="en"><span>${q.text}</span></div>
        ${q.image ? `<div class="media"><img alt="Image" src="${IMG(q.image)}"></div>` : ''}
      </div>`;
    }
    el.querySelector('.slot').innerHTML = slot;
    ['reply', 'repost', 'like', 'views'].forEach((k, i) => { el.querySelector(`[data-n="${k}"]`).textContent = p.n[i]; });
    feed.appendChild(el);
  }

  // Served at /home and /i/bookmarks; the Bookmarks page is where XMarks adds Sync Bookmarks.
  if (location.pathname.startsWith('/i/bookmarks')) {
    document.querySelector('.tabs').innerHTML = '<div class="tab active no-underline" style="justify-content:flex-start;padding-left:16px;font-size:20px">Bookmarks</div>';
    document.querySelectorAll('.nav-item').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '/i/bookmarks'));
  }
})();
