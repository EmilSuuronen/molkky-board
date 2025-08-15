const CACHE_NAME = 'scoreboard-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './scripts/main.js',
    './manifest.json'
];

// Install Service Worker and cache files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

// Activate Service Worker and remove old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames.map(name => {
                    if (name !== CACHE_NAME) return caches.delete(name);
                })
            )
        )
    );
});

// Intercept fetch requests
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(resp => resp || fetch(event.request))
    );
});
