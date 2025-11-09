const CACHE_NAME = 'smuve-cache-v8';
const AUDIO_CACHE_NAME = 'smuve-audio-cache-v6';

// App shell files
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/src/index.tsx', // Cache main entrypoint
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&family=Exo+2:wght@700&display=swap'
];

// URLs for audio files to be cached on demand
const audioUrlPatterns = [
  'https://webaudiomodules.org/sites/default/files/sounds/',
  'https://cdn.jsdelivr.net/gh/s-j-w/web-audio-drum-samples@master/',
  'https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts/FatBoy/',
  'https://cdn.jsdelivr.net/gh/web-audio-school/examples@master/sounds/',
  'https://cdn.jsdelivr.net/gh/E-FAIL/audiocollection@master/'
];


self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened main cache');
        // Use addAll with a catch to prevent install failure if one asset fails
        return cache.addAll(urlsToCache).catch(err => {
            console.error('Failed to cache initial assets:', err);
        });
      })
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // We only want to handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  // For navigation requests (to HTML pages), use a network-first strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache-first strategy for audio files
  if (audioUrlPatterns.some(pattern => requestUrl.href.startsWith(pattern))) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          // If found in cache, return it. Otherwise, fetch from network.
          return response || fetch(event.request).then(networkResponse => {
            // Cache the new audio file for future use.
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // For all other requests, use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Not in cache, fetch from network, then cache it for the app shell cache
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME, AUDIO_CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});