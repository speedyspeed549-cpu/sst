const CACHE_NAME = 'nss-ultimate-cache-v6';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, clone);
                    });
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
