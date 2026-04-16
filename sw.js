// ============================================================
//  BACKPACK v2 — SERVICE WORKER
//  Background caching, offline support, sync
// ============================================================

const CACHE = 'backpack-v2';
const SHELL = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('sync', e => {
  if (e.tag === 'backpack-sync') {
    e.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC_COMPLETE', ts: Date.now() }))
      )
    );
  }
});

self.addEventListener('message', e => {
  const { type } = e.data || {};
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'GET_STATUS') e.source.postMessage({ type: 'STATUS_OK', cache: CACHE, ts: Date.now() });
});
