const cacheName = 'tz-trade-v1';
const staticAssets = [
  './',
  './index.html',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', async e => {
  const cache = await caches.open(cacheName);
  await cache.addAll(staticAssets);
  return self.skipWaiting();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
        // Return cached response if found, else fetch from network
        return cachedResponse || fetch(e.request);
    })
  );
});
