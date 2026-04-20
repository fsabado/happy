const CACHE_VERSION = 'happy-v1';
const PRECACHE = [
    '/',
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Only handle GET requests.
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Never intercept cross-origin requests (backend is on a different origin).
    if (url.origin !== self.location.origin) return;

    // Never intercept API or socket paths in case backend ever becomes same-origin.
    if (url.pathname.startsWith('/api/')) return;
    if (url.pathname.startsWith('/socket.io/')) return;

    // Navigation (HTML) requests — network first, fall back to cached root shell.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match('/'))
        );
        return;
    }

    // Hashed static assets from Expo — cache first (content-addressed, safe to cache forever).
    if (url.pathname.startsWith('/_expo/static/')) {
        event.respondWith(
            caches.match(req).then((hit) => {
                if (hit) return hit;
                return fetch(req).then((res) => {
                    const clone = res.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(req, clone));
                    return res;
                });
            })
        );
        return;
    }

    // Everything else — network first, cache fallback.
    event.respondWith(
        fetch(req).catch(() => caches.match(req))
    );
});
