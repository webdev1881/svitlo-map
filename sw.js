// Service worker: оболонка сторінки працює офлайн, дані (API, Firebase, плитки карти) завжди беруться з мережі.
const CACHE = 'svitlo-shell-v1';
const CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];
const SHELL = ['/', '/manifest.webmanifest', '/pwa/icon-192.png', '/pwa/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  // сторінка: спершу мережа (щоб оновлення з'являлися одразу), без мережі — з кешу
  if(req.mode === 'navigate' && url.origin === location.origin && (url.pathname === '/' || url.pathname === '/index.html')){
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('/', copy));
      return res;
    }).catch(() => caches.match('/')));
    return;
  }

  // бібліотеки з CDN (версії зафіксовані в URL): з кешу, оновлення у фоні
  if(CDN.includes(url.hostname)){
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if(res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
  // решта (api.svitlobot, Firebase, воркер, плитки OSM, admin.html) — без втручання
});
