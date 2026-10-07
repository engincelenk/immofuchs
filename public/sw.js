/**
 * ImmoFuchs Service Worker v50
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

  // Navigations-Anfragen (HTML) → Network-First, Fallback /index.html.
  // Der Timeout ist online bewusst grosszuegig (Bugreport 2026-09-09): mit den
  // frueheren 800ms bekam jeder, dessen Verbindung langsamer antwortete,
  // dauerhaft die gecachte index.html - und damit dauerhaft die alten
  // Bundle-Namen, also eine alte App-Version, die sich nur noch durch
  // manuelles Leeren der Website-Daten beheben liess. Der kurze Timeout ist
  // fuer den Offline-Fall gedacht und gilt jetzt auch nur noch dort.
  if (request.mode === 'navigate') {
    event.respondWith(
      // Online: gewartet wird auf das Netz, OHNE Timeout-Rueckfall auf eine
      // gecachte index.html - sie verweist nach einem Deploy auf geloeschte
      // Bundles (2026-10-03: leere Seite). Der Cache greift nur noch, wenn das
      // Netz wirklich fehlschlaegt oder der Browser offline ist.
      (navigator.onLine ? fetch(request) : fetchWithTimeout(request, 800))
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
          cacheResponse(CACHE_NAME, request, response.clone());
        }
        return response;
      })
      // Kein Cache-Treffer (typisch direkt nach einem Deploy: die frische
      // index.html verweist auf Bundle-Namen, die noch nie gecacht wurden) -
      // dann ohne Timeout erneut ans Netz, statt die Seite mit einer leeren
      // Antwort kaputtzumachen.
      .catch(() => caches.match(request).then(treffer => treffer || fetch(request)))
  );
});

// ── Helper ────────────────────────────────────────────────
function cacheResponse(cacheName, request, response) {
  caches.open(cacheName).then(cache => cache.put(request, response));
}

// Fetch mit Timeout — nach ms ms wird auf Cache gefallen.
// Verhindert den 4-5s Browser-Timeout bei offline Nutzung.
//
// Wichtig (Bugreport 2026-09-09): Eine Antwort, die NACH dem Timeout eintrifft,
// wird nicht mehr ausgeliefert - aber sehr wohl noch in den Cache geschrieben.
// Vorher wurde sie ersatzlos verworfen; der Cache blieb damit auf ewig auf dem
// Stand des letzten schnellen Ladevorgangs stehen, und ein Nutzer mit langsamer
// Verbindung sah nie wieder eine neue Version. Jetzt gilt: dieser Aufruf zeigt
// noch den alten Stand, der naechste ist aktuell.
function fetchWithTimeout(request, ms = 800) {
  return new Promise((resolve, reject) => {
    let abgelaufen = false;
    const timer = setTimeout(() => {
      abgelaufen = true;
      reject(new Error('sw-timeout'));
    }, ms);
    fetch(request).then(
      res => {
        clearTimeout(timer);
        if (abgelaufen) {
          if (res.ok) cacheResponse(CACHE_NAME, request, res.clone());
          return;
        }
        resolve(res);
      },
      err => {
        clearTimeout(timer);
        if (!abgelaufen) reject(err);
      }
    );
  });
}

// Zinsalarm: Der Bauzins kommt seit 2026-10-01 aus data.js und steckt im
// Bundle. Die App schickt ihn per SET_ALARM mit (siehe ZinsAlarm.jsx), nach
// jedem Deploy also der neue Wert. Die fruehere Hintergrundpruefung von
// /zinsen.json las ein Feld "quellen", das es seit 2026-08-24 nicht mehr gab -
// sie hat nie ausgeloest und ist mit der Datei entfallen.

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
