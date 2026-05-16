/**
 * ImmoFuchs Service Worker v46
 * Strategie: Network-First mit vollständigem Same-Origin-Caching
 * → Alle Vite-Assets (auch gehashte Bundles) werden beim ersten Aufruf gecacht
 * → Danach: volle Offline-Funktionalität
 */

const CACHE_NAME = 'immofuchs-v46';

// App Shell: Kritische Dateien sofort beim Install cachen
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/zinsen.json',
];

// ── Install ──────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: Alte Caches aufräumen ──────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Network-First + Auto-Caching ──────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Nur GET-Requests und Same-Origin behandeln
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Navigations-Anfragen (HTML) → Network first, Fallback /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          cacheResponse(CACHE_NAME, request, response.clone());
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Alle anderen Same-Origin Assets (JS/CSS Bundles, PNG, JSON, CSV)
  // → Network first: frisch holen + cachen; bei Offline aus Cache
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          cacheResponse(CACHE_NAME, request, response.clone());
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── Helper ────────────────────────────────────────────────
function cacheResponse(cacheName, request, response) {
  caches.open(cacheName).then(cache => cache.put(request, response));
}
