// Pré-cache versionné : la liste est écrite à la main, tests/outillage/service-worker.test.mjs la garde à jour.
// Changer la version (donc ce nom) à chaque release : c'est elle qui renouvelle le cache.
const CACHE = 'braise-0.9.1';
const PREFIXE = 'braise-';
const PRECACHE = [
  './',
  'index.html',
  'style.css',
  'game.js',
  'scene.js',
  'perf.js',
  'engine/affichage.js',
  'engine/annonces.js',
  'engine/apparence-heros.js',
  'engine/audio.js',
  'engine/balance.js',
  'engine/carte.js',
  'engine/combat.js',
  'engine/decors.js',
  'engine/ennemis-visuels.js',
  'engine/equipement.js',
  'engine/etincelles.js',
  'engine/inventaire.js',
  'engine/mise-a-jour.js',
  'engine/objectifs.js',
  'engine/offline.js',
  'engine/pwa.js',
  'engine/bestiaire.js',
  'engine/succes.js',
  'engine/automatismes.js',
  'engine/recits.js',
  'engine/save.js',
  'engine/scene-queue.js',
  'engine/sons.js',
  'engine/state.js',
  'engine/talents-libelles.js',
  'engine/talents.js',
  'engine/zones.js',
  'manifest.webmanifest',
  'credits.html',
  'assets/fonts/dm-sans-latin-400-normal.woff2',
  'assets/fonts/dm-sans-latin-500-normal.woff2',
  'assets/fonts/dm-sans-latin-600-normal.woff2',
  'assets/fonts/dm-sans-latin-700-normal.woff2',
  'assets/fonts/space-grotesk-latin-400-normal.woff2',
  'assets/fonts/space-grotesk-latin-500-normal.woff2',
  'assets/fonts/space-grotesk-latin-600-normal.woff2',
  'assets/fonts/space-grotesk-latin-700-normal.woff2',
  'assets/icons/apple-touch-icon-180.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/Tiles/tile_0100.png',
  'assets/Tiles/tile_0104.png',
  'assets/Tiles/tile_0110.png',
  'assets/lpc/bat.png',
  'assets/lpc/body-hurt.png',
  'assets/lpc/body-swing.png',
  'assets/lpc/body-walk.png',
  'assets/lpc/boots-hurt.png',
  'assets/lpc/boots-swing.png',
  'assets/lpc/boots-walk.png',
  'assets/lpc/castlefloors.png',
  'assets/lpc/castlewalls.png',
  'assets/lpc/chests.png',
  'assets/lpc/dirt.png',
  'assets/lpc/dungeon.png',
  'assets/lpc/eyeball.png',
  'assets/lpc/ghost.png',
  'assets/lpc/goblin.png',
  'assets/lpc/goblin-sword.png',
  'assets/lpc/golem.png',
  'assets/lpc/grass.png',
  'assets/lpc/hood-hurt.png',
  'assets/lpc/hood-swing.png',
  'assets/lpc/hood-walk.png',
  'assets/lpc/imp.png',
  'assets/lpc/mail-hurt.png',
  'assets/lpc/mail-swing.png',
  'assets/lpc/mail-walk.png',
  'assets/lpc/pants-hurt.png',
  'assets/lpc/pants-swing.png',
  'assets/lpc/pants-walk.png',
  'assets/lpc/plate-hurt.png',
  'assets/lpc/plate-swing.png',
  'assets/lpc/plate-walk.png',
  'assets/lpc/portrait.png',
  'assets/lpc/rock.png',
  'assets/lpc/slime.png',
  'assets/lpc/snake.png',
  'assets/lpc/spider.png',
  'assets/lpc/sword.png',
  'assets/lpc/treetop.png',
  'assets/lpc/trunk.png',
  'assets/lpc/water.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)));
});

// Pas de skipWaiting à l'install : la nouvelle version attend que le joueur clique sur « Recharger ».
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(noms => Promise.all(noms.filter(nom => nom.startsWith(PREFIXE) && nom !== CACHE).map(nom => caches.delete(nom))))
  );
});

self.addEventListener('fetch', event => {
  const requete = event.request;
  if (requete.method !== 'GET' || new URL(requete.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(requete, { ignoreSearch: true }).then(trouve => trouve || fetch(requete)));
});
