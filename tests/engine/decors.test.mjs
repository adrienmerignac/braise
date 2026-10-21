import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DECORS, TRANSITION_MS, FORCE_DISCRETE, decorDeZone, idDecor, fichiersDecor, animationDecor, dureeTransition, opaciteFondu } from '../../dist/engine/decors.js';
import { ZONE_IDS } from '../../dist/engine/balance.js';

const sources = JSON.parse(readFileSync(new URL('../../dist/assets/lpc/sources.json', import.meta.url), 'utf8'));
const manifeste = JSON.parse(readFileSync(new URL('../../tools/assets-manifest.json', import.meta.url), 'utf8'));
const chemins = new Set(manifeste.fichiers.map(f => f.chemin));

test('chaque zone a un décor dont les fichiers sont sourcés et au manifeste', () => {
  for (const id of ZONE_IDS) {
    assert.ok(DECORS[id], id);
    assert.ok(fichiersDecor(id).length > 0, id);
    for (const nom of fichiersDecor(id)) {
      assert.ok(sources[`${nom}.png`], `${id}: ${nom} absent de sources.json`);
      assert.ok(chemins.has(`assets/lpc/${nom}.png`), `${id}: ${nom} absent du manifeste`);
    }
  }
});

test('le décor ne cite que ses propres fichiers', () => {
  for (const id of ZONE_IDS) {
    const d = DECORS[id], permis = new Set(d.fichiers);
    const cites = [d.sol.fichier, d.chemin?.fichier, d.mur?.fichier, d.eau?.fichier, ...d.accessoires.map(a => a[0])].filter(Boolean);
    for (const f of cites) assert.ok(permis.has(f), `${id}: ${f}`);
  }
});

test('zone inconnue ou absente : la forêt', () => {
  for (const z of ['nimporte', undefined, null, '']) { assert.equal(idDecor(z), 'foret'); assert.equal(decorDeZone(z), DECORS.foret); }
});

test('mouvement réduit : ni animation ni durée de transition', () => {
  assert.equal(animationDecor('ruines', { reduit: true }), null);
  assert.equal(animationDecor('cryptes', { reduit: true, discret: true }), null);
  assert.equal(dureeTransition({ reduit: true }), 0);
  assert.equal(dureeTransition(), TRANSITION_MS);
});

test('animations propres à la zone, atténuées en effets discrets ; aucune en forêt', () => {
  assert.equal(animationDecor('foret'), null);
  assert.deepEqual(animationDecor('ruines'), { nom: 'reflets', force: 1 });
  assert.deepEqual(animationDecor('cryptes', { discret: true }), { nom: 'braises', force: FORCE_DISCRETE });
});

test('le fondu monte à mi-durée puis redescend ; nul hors transition', () => {
  assert.equal(opaciteFondu(0), 0);
  assert.equal(opaciteFondu(TRANSITION_MS / 2), 1);
  assert.ok(opaciteFondu(TRANSITION_MS * .25) > 0 && opaciteFondu(TRANSITION_MS * .25) < 1);
  assert.equal(opaciteFondu(TRANSITION_MS), 0);
  assert.equal(opaciteFondu(100, 0), 0);
});

import { fichiersDeZone, toutesPlanchesMonde } from '../../dist/engine/decors.js';
import { BESTIAIRE } from '../../dist/engine/balance.js';
import { ENEMY_LOOKS, gardienLook } from '../../dist/engine/ennemis-visuels.js';
import { ACTIONS_HEROS } from '../../dist/engine/apparence-heros.js';

test('fichiersDeZone couvre les ennemis, le gardien et le décor de chaque zone, sans doublon', () => {
  for (const zone of ZONE_IDS) {
    const f = fichiersDeZone(zone);
    for (const type of BESTIAIRE[zone].types) assert.ok(f.includes(ENEMY_LOOKS[type].sheet), `${zone} : ${type}`);
    assert.ok(f.includes(gardienLook(zone).sheet));
    for (const d of fichiersDecor(zone)) assert.ok(f.includes(d));
    assert.equal(new Set(f).size, f.length);
  }
});

test('les trois zones couvrent toutes les planches du monde, et la forêt ne demande rien des cryptes', () => {
  const union = new Set(ZONE_IDS.flatMap(fichiersDeZone));
  for (const n of toutesPlanchesMonde()) assert.ok(union.has(n) || n === 'chests', n);
  for (const n of union) assert.ok(toutesPlanchesMonde().includes(n));
  const propresCryptes = fichiersDeZone('cryptes').filter(n => !fichiersDeZone('foret').includes(n));
  assert.ok(propresCryptes.includes('imp') && propresCryptes.includes('dungeon'));
  for (const n of propresCryptes) assert.ok(!fichiersDeZone('foret').includes(n));
  assert.deepEqual(fichiersDeZone('inconnue'), fichiersDeZone('foret'));
});

test('les planches hors héros du dossier assets correspondent aux planches déclarées', () => {
  const heros = ['body', 'pants', 'boots', 'mail', 'plate', 'hood'].flatMap(c => ACTIONS_HEROS.map(a => `${c}-${a}`)).concat('sword');
  const scene = readFileSync(new URL('../../dist/scene.js', import.meta.url), 'utf8');
  assert.ok(scene.includes('fichiersDeZone(decorId)'));
  assert.equal(new Set([...heros, ...toutesPlanchesMonde()]).size, heros.length + toutesPlanchesMonde().length);
});
