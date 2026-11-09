const CACHE = 'masroof-lite-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icons/masroof-192.png', '/icons/masroof-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(SHELL);
    // Keep the hashed Vite assets available for opening the app without a connection.
    try {
      const html = await (await fetch('/', { cache: 'reload' })).text();
      const urls = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(m => m[1]);
      await cache.addAll([...new Set(urls)]);
    } catch { /* Still works online if pre-caching fails. */ }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('masroof-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone(); caches.open(CACHE).then(c => c.put('/', copy)).catch(() => {});
      return response;
    }).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(request).then(found => found || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {}); }
    return response;
  })));
});
