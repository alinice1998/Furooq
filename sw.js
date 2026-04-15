const CACHE_NAME = 'furooq-v4';
const ASSETS = [
  'index.html',
  'style.css',
  'js/engine.js',
  'js/app.jsx',
  'manifest.json',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then(networkResponse => {
        if (event.request.url.includes('.json')) {
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
