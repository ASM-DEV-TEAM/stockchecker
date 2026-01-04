const CACHE_NAME = 'stock-app-cache-v8';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './vendor/jquery/jquery.min.js',
    './vendor/fomantic/semantic.min.js',
    './vendor/fomantic/semantic.min.css',
    './vendor/jspdf/jspdf.umd.min.js',
    './vendor/html5-qrcode/html5-qrcode.min.js',
    './vendor/fomantic/themes/default/assets/fonts/icons.woff2',
    './vendor/fomantic/themes/default/assets/fonts/icons.woff',
    './vendor/fomantic/themes/default/assets/fonts/Lato-Regular.woff2',
    './vendor/fomantic/themes/default/assets/fonts/Lato-Bold.woff2',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    // Network First strategy for the main page to ensure updates
    if (event.request.mode === 'navigate' ||
        (event.request.method === 'GET' && event.request.url.includes('index.html'))) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
        return;
    }

    // Cache First for other assets
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
