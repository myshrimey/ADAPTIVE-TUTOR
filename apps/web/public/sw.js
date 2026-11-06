// Sahayak service worker (v102). It exists only so browsers will offer "Install".
// It deliberately caches NOTHING and never answers a request itself: every request goes to the network as normal,
// so a student's pages and answers are never stored on the device by this file and are never stale.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* pass through: no caching, no offline copy */ });
