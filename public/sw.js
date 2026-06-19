/**
 * ImmoFuchs Service Worker v49
 * Strategie: Network-First mit Timeout + vollständigem Same-Origin-Caching
 * → Online: frisch vom Netz, gecacht für Offline
 * → Offline: sofort aus Cache (max. 800ms Timeout statt Browser-Default ~30s)
 * Sprint 3: Zinsalarm via Push Notification
 */

const CACHE_NAME = 'immofuchs-__BUILD_VERSION__';

// ── Zinsalarm State (im SW-Kontext gespeichert) ───────────
let alarmConfig = null; // {enabled, threshold, notifTitle, notifBody, avg, lang}

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

  // Navigations-Anfragen (HTML) → Network-First mit Timeout, Fallback /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchWithTimeout(request, 800)
        .then(response => {
          cacheResponse(CACHE_NAME, request, response.clone());
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Alle anderen Same-Origin Assets (JS/CSS Bundles, PNG, JSON, CSV)
  // → Network-First mit Timeout: offline sofort aus Cache statt 4-5s warten
  event.respondWith(
    fetchWithTimeout(request, 800)
      .then(response => {
        if (response.ok) {
          // Zinsalarm: bei /zinsen.json Fetch im Hintergrund prüfen
          if (url.pathname === '/zinsen.json' && alarmConfig?.enabled) {
            response.clone().json().then(checkAlarmFromZinsen).catch(() => {});
          }
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

// Fetch mit Timeout — nach ms ms wird auf Cache gefallen.
// Verhindert den 4-5s Browser-Timeout bei offline Nutzung.
function fetchWithTimeout(request, ms = 800) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sw-timeout')), ms);
    fetch(request).then(
      res => { clearTimeout(timer); resolve(res); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

// ── Alarm: Zinsen prüfen und ggf. Notification anzeigen ──
function checkAlarmFromZinsen(jsonData) {
  if (!alarmConfig?.enabled || typeof alarmConfig.threshold !== 'number') return;
  try {
    const werte = (jsonData.quellen || []).map(q => q.wert).filter(v => v > 0);
    if (!werte.length) return;
    const sum = werte.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / werte.length * 20) / 20;
    if (avg <= alarmConfig.threshold) {
      const title = alarmConfig.notifTitle || 'ImmoFuchs Zinsalarm';
      const body = (alarmConfig.notifBody || 'Zinsen bei {avg}% – unter {threshold}%')
        .replace('{avg}', avg)
        .replace('{threshold}', alarmConfig.threshold);
      self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'zinsalarm',
        renotify: true,
        data: { avg, threshold: alarmConfig.threshold },
      });
    }
  } catch(e) { /* silent */ }
}

// ── Message Handler: Alarm-Config vom App empfangen ───────
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SET_ALARM') {
    alarmConfig = event.data;
    // Sofort prüfen wenn avg mitgeliefert
    if (alarmConfig.enabled && typeof alarmConfig.avg === 'number') {
      if (alarmConfig.avg <= alarmConfig.threshold) {
        const title = alarmConfig.notifTitle || 'ImmoFuchs Zinsalarm';
        const body = (alarmConfig.notifBody || 'Zinsen bei {avg}% – unter {threshold}%')
          .replace('{avg}', alarmConfig.avg)
          .replace('{threshold}', alarmConfig.threshold);
        self.registration.showNotification(title, {
          body, icon: '/icon-192.png', badge: '/icon-192.png',
          tag: 'zinsalarm', renotify: true,
        });
      }
    }
  }
});

// ── Notification Click: App in den Vordergrund ────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        if (list.length) return list[0].focus();
        return clients.openWindow('/');
      })
  );
});
