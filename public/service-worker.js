// public/service-worker.js

// Increment this version any time you make changes
const CACHE_NAME = 'dgnotes-cache-v1.0.51';

const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
];

// IndexedDB functions for the share target
function getDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('dgnotes-shared-files', 1);
        request.onerror = event => reject("IndexedDB error: " + event.target.errorCode);
        request.onsuccess = event => resolve(event.target.result);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
        };
    });
}

async function saveFile(file) {
    const db = await getDb();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.put({ file: file, timestamp: new Date() });
        request.onsuccess = resolve;
        request.onerror = reject;
    });
}

// Install event: cache the app shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                    return null;
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event: handle network requests and the share target
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Look for the '?share-target=true' query parameter to identify the share.
    if (event.request.method === 'POST' && url.searchParams.has('share-target')) {
        event.respondWith((async () => {
            try {
                const formData = await event.request.formData();
                // The manifest guarantees the file will have the name "csvfile".
                const file = formData.get('csvfile');

                if (file) {
                    await saveFile(file);
                    // Redirect to a URL that tells the app to trigger the import from IndexedDB.
                    return Response.redirect('/?trigger-import=true', 303);
                } else {
                    throw new Error('No file named "csvfile" was found in the shared data.');
                }
            } catch (error) {
                console.error('Service Worker: Error handling shared file:', error);
                return Response.redirect('/?share-target-error=true', 303);
            }
        })());
        return;
    }

    // For all other requests, use a "Network falling back to cache" strategy.
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});


self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});