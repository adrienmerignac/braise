import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { enregistrerServiceWorker } from '../../dist/engine/pwa.js';

const dist = new URL('../../dist/', import.meta.url);
const lire = chemin => readFileSync(new URL(chemin, dist), 'utf8');
const sw = lire('sw.js');
const version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
const precache = new Set([...sw.match(/const PRECACHE = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]));

test('chaque entrée de PRECACHE existe dans dist/', () => {
  assert.ok(precache.size > 40);
  for (const chemin of precache) assert.ok(existsSync(new URL(chemin, dist)), chemin);
});

test('modules du moteur, icônes du manifeste et fichiers racine sont pré-cachés', () => {
  for (const f of readdirSync(new URL('engine/', dist)).filter(f => f.endsWith('.js'))) assert.ok(precache.has(`engine/${f}`), `engine/${f}`);
  for (const icone of JSON.parse(lire('manifest.webmanifest')).icons) assert.ok(precache.has(icone.src), icone.src);
  for (const f of ['index.html', 'style.css', 'game.js', 'scene.js', 'manifest.webmanifest', 'credits.html']) assert.ok(precache.has(f), f);
});

test('chaque image chargée par scene.js, index.html ou game.js est pré-cachée', async () => {
  const { ACTIONS_HEROS } = await import('../../dist/engine/apparence-heros.js');
  const { toutesPlanchesMonde } = await import('../../dist/engine/decors.js');
  const planches = [...ACTIONS_HEROS.flatMap(a => ['body', 'pants', 'boots', 'mail', 'plate', 'hood'].map(c => `${c}-${a}`)), 'sword', ...toutesPlanchesMonde()];
  const attendues = new Set(planches.map(n => `assets/lpc/${n}.png`));
  for (const m of lire('index.html').matchAll(/(?:src|href)="(assets\/[^"]+\.png)"/g)) attendues.add(m[1]);
  for (const m of lire('game.js').matchAll(/\['(?:weapon|armor|luck)','[^']+',(\d+)\]/g)) attendues.add(`assets/Tiles/tile_${m[1].padStart(4, '0')}.png`);
  assert.ok(attendues.size > 40);
  for (const chemin of attendues) assert.ok(precache.has(chemin), chemin);
});

test('le nom du cache porte la version de package.json', () => {
  assert.match(sw, new RegExp(`const CACHE = 'braise-${version.replaceAll('.', '\\.')}'`));
});

test('le worker ne touche pas à la sauvegarde et ne purge que ses caches braise-', () => {
  assert.doesNotMatch(sw, /localStorage/);
  assert.doesNotMatch(sw, /braise-v2/);
  assert.match(sw, /const PREFIXE = 'braise-'/);
  assert.match(sw, /nom\.startsWith\(PREFIXE\) && nom !== CACHE/);
});

test('l’enregistrement est silencieux sans API ou si register échoue', async () => {
  enregistrerServiceWorker({}, { addEventListener() { throw Error('ne doit pas être appelé'); } });
  let url = null;
  enregistrerServiceWorker({ serviceWorker: { register: u => { url = u; return Promise.reject(Error('refus')); } } }, { document: { readyState: 'complete' } });
  await new Promise(r => setTimeout(r, 0));
  assert.equal(url, './sw.js');
  enregistrerServiceWorker({ serviceWorker: { register() { throw Error('sync'); } } }, { document: { readyState: 'complete' } });
});
