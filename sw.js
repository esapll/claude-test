// Service worker : tout est mis en cache pour un usage 100 % hors ligne.
// Incrémenter VERSION à chaque modification des fichiers.
const VERSION = 'coach-mobilite-v2';
const FICHIERS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "assets/fonts/inter.woff2",
  "assets/fonts/newsreader.woff2",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/keepawake.mp4",
  "src/data/bibliotheque.js",
  "src/data/donnees-initiales.js",
  "src/data/tests.js",
  "src/engine/dates.js",
  "src/engine/durations.js",
  "src/engine/fusion.js",
  "src/engine/generator.js",
  "src/engine/scoring.js",
  "src/engine/stats.js",
  "src/engine/timeline.js",
  "src/main.js",
  "src/store.js",
  "src/sync.js",
  "src/ui/accueil.js",
  "src/ui/bibliotheque.js",
  "src/ui/bilan.js",
  "src/ui/charts.js",
  "src/ui/device.js",
  "src/ui/dom.js",
  "src/ui/generer.js",
  "src/ui/historique.js",
  "src/ui/journal.js",
  "src/ui/minuteur.js",
  "src/ui/reglages.js",
  "src/ui/session.js",
  "src/ui/styles.css",
  "src/ui/test.js",
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Cache d'abord, mise à jour en arrière-plan (stale-while-revalidate).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') return cache.match('index.html');
    return new Response('Hors ligne', { status: 503 });
  }));
});
