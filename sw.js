// Coach IA 2030 — Service Worker
// Stratégie : "network-first, cache-fallback" pour tout ce qui vient du site (HTML, JS, CSS,
//             données de sync) → toujours frais quand en ligne, offline possible.
//             "cache-first" uniquement pour icônes/images/polices.

const CACHE_VERSION = "coach-ia-v11";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./dashboard.html",
  "./css/carnet.css",
  "./js/carnet.js",
  "./js/bilan.js",
  "./accueil.html",
  "./journal.html",
  "./vue360.html",
  "./historique.html",
  "./objectifs.html",
  "./archive.html",
  "./parametres.html",
  "./rapport.html",
  "./manifest.json",
  "./css/style.css",
  "./js/data.js",
  "./js/scoring.js",
  "./js/dashboard.js",
  "./js/journal.js",
  "./js/illness-override.js",
  "./js/manual-activities.js",
  "./js/chat.js",
  "./js/mobile-nav.js",
  "./js/historique.js",
  "./js/objectifs.js",
  "./js/vue360.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isHTML = req.mode === "navigate" || req.headers.get("accept")?.includes("text/html");
  // Tout le code et les données du site (régénérées à chaque sync) : réseau d'abord.
  // Seuls icônes / images / polices restent cache-first.
  const isStatic = /\.(png|jpg|jpeg|svg|ico|woff2?|ttf)$/i.test(url.pathname);
  const isOwn = url.origin === self.location.origin;

  if (isHTML || (isOwn && !isStatic)) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (resp.ok && url.origin === self.location.origin) {
          const copy = resp.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
        }
        return resp;
      });
    })
  );
});
