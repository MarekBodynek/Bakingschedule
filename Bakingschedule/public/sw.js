// Service Worker for PWA
const CACHE_NAME = 'bakery-planning-v3';
const urlsToCache = [
  '/',
  '/index.html'
];

// Install event - cache podstawowych zasobów
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event - czyszczenie starych cache'ów
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - strategia network-first z fallback do cache
self.addEventListener('fetch', (event) => {
  // Ignoruj requesty z chrome-extension, data:, blob: itp.
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response - jedna kopia do cache, druga do return
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(() => {
        // Jeśli network failed, użyj cache
        return caches.match(event.request);
      })
  );
});
