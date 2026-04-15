const CACHE_NAME = 'furooq-v10';
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
  'fonts/cairo-900.ttf'
];

const EXTERNAL_ASSETS = [
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://unpkg.com/lucide@latest',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const localPromise = cache.addAll(ASSETS);
      const externalPromise = Promise.all(
        EXTERNAL_ASSETS.map(url => 
          fetch(url)
            .then(res => {
              // Only cache valid responses (handles redirects gracefully by verifying ok)
              if (res.ok) cache.put(url, res);
            })
            .catch(err => console.error("Failed to precache external asset", url))
        )
      );
      return Promise.all([localPromise, externalPromise]);
    })
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
      // Stale-While-Revalidate strategy: INSTANT load from cache, then update from network
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          }).catch((err) => {
            console.log("Background network update failed", err);
          });

          return cachedResponse || fetchPromise.then(res => res || new Response('Offline', {status: 503}));
        })
      );
  } else {
      // Cache-First strategy: Use cache, fetch ONLY if not in cache (saves bandwidth)
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
            return new Response('Offline', {status: 503});
          });
        })
      );
  }
});
