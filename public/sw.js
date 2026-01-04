const CACHE_NAME = 'stock-app-cache-v1';
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
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
