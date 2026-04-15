const CACHE_NAME = 'furooq-v8';
const ASSETS = [
  'index.html',
  'style.css',
  'js/engine.js',
  'js/app.jsx',
  'manifest.json',
  'pwa-192x192.png',
  'pwa-512x512.png',
  'apple-touch-icon.png',
  'logo.png',
  'fonts/amiri-400.ttf',
  'fonts/amiri-700.ttf',
  'fonts/cairo-400.ttf',
  'fonts/cairo-700.ttf',
  'fonts/cairo-900.ttf',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://unpkg.com/lucide@latest',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  const isLocal = url.origin === location.origin;
  const isDataJson = url.pathname.includes('/data/') && url.pathname.endsWith('.json');

  if (isLocal && !isDataJson) {
      // Network-First strategy for local HTML/JS/CSS files -> Ensures instant live updates!
      event.respondWith(
        fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => caches.match(event.request)) // Fallback to cache if offline
      );
  } else {
      // Cache-First strategy for external CDNs, fonts, and large JSON files
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
               const responseToCache = networkResponse.clone();
               caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          }).catch(() => {
            console.log("Fetch failed; returning offline fallback.", event.request.url);
          });
        })
      );
  }
});
