import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_SHEETS, ENEMY_LOOKS, enemyLook } from '../../dist/engine/ennemis-visuels.js';
import { ENEMY_CATALOG, ZONE_IDS } from '../../dist/engine/balance.js';
import { readFileSync } from 'node:fs';
const ENEMY_KINDS = Object.keys(ENEMY_CATALOG);

test('chaque type d’ennemi a une planche déclarée, des lignes et une échelle', () => {
  for (const kind of ENEMY_KINDS) {
    const look = enemyLook(kind);
    assert.ok(ENEMY_SHEETS[look.sheet], kind);
    assert.ok(look.scale > 0, kind);
    assert.ok(Number.isInteger(look.rows.west) && Number.isInteger(look.rows.cols), kind);
    assert.ok(look.rows.death === null || Number.isInteger(look.rows.death), kind);
  }
  assert.deepEqual(Object.keys(ENEMY_LOOKS).sort(), [...ENEMY_KINDS].sort());
});

test('Éclaireur et Traqueur sur goblin-sword, Pillard sur goblin, Traqueur à 1,7', () => {
  assert.equal(enemyLook('eclaireur').sheet, 'goblin-sword');
  assert.equal(enemyLook('pillard').sheet, 'goblin');
  assert.equal(enemyLook('traqueur').sheet, 'goblin-sword');
  assert.equal(enemyLook('traqueur').scale, 1.7);
});

test('les lignes sont des objets propres à chaque planche, jamais partagés', () => {
  assert.notEqual(ENEMY_SHEETS.goblin, ENEMY_SHEETS['goblin-sword']);
});

test('un type absent ou inconnu retombe sur l’Éclaireur', () => {
  assert.deepEqual(enemyLook(undefined), enemyLook('eclaireur'));
  assert.deepEqual(enemyLook('x'), enemyLook('eclaireur'));
});

import { gardienLook, sequenceGardien, GARDIEN_SEQUENCE as S, GARDIEN_LOOK, tailleCase, placeEnnemi, colonneEnnemi } from '../../dist/engine/ennemis-visuels.js';

test('le gardien a une planche existante, une échelle supérieure à celle des ennemis normaux et ses lignes', () => {
  const look = gardienLook();
  assert.ok(ENEMY_SHEETS[look.sheet]);
  assert.deepEqual(look.rows, ENEMY_SHEETS[look.sheet]);
  assert.ok(look.scale > Math.max(...Object.values(ENEMY_LOOKS).map(l => l.scale)));
  assert.ok(GARDIEN_LOOK.ombreRayon > 35);
});

test('séquence du gardien : repos, recul vers l’arrière, élan vers le héros, coup puis repos', () => {
  assert.equal(sequenceGardien(S.reculDebut - 1).phase, 'repos');
  const recul = sequenceGardien(S.reculDebut + 25);
  assert.equal(recul.phase, 'recul');
  assert.ok(recul.dx > 0 && recul.dx < S.reculPx);
  const elan = sequenceGardien(S.elanDebut + 20);
  assert.equal(elan.phase, 'elan');
  assert.ok(elan.dx < S.reculPx);
  const coup = sequenceGardien(S.coupDebut);
  assert.equal(coup.phase, 'coup');
  assert.ok(coup.dx < 0 && coup.lueur === 1);
  assert.ok(sequenceGardien(S.coupDebut + 200).lueur < coup.lueur);
  assert.deepEqual(sequenceGardien(S.coupFin), { phase: 'repos', dx: 0, lueur: 0 });
});

test('la charge dure quelques dizaines de ms et finit au début du coup', () => {
  const ages = Array.from({ length: 1200 }, (_, i) => i);
  const charge = ages.filter(a => ['recul', 'elan'].includes(sequenceGardien(a).phase));
  assert.ok(charge.length >= 30 && charge.length <= 150, `durée ${charge.length} ms`);
  assert.equal(charge[charge.length - 1] + 1, S.coupDebut);
  assert.equal(sequenceGardien(S.coupDebut).phase, 'coup');
});

test('mouvement réduit : aucun décalage, la lueur reste ; effets discrets : lueur atténuée', () => {
  for (const age of [S.reculDebut + 10, S.elanDebut + 10, S.coupDebut + 50]) {
    const plein = sequenceGardien(age);
    const reduit = sequenceGardien(age, { reduit: true });
    assert.equal(reduit.dx, 0);
    assert.equal(reduit.lueur, plein.lueur);
    assert.ok(reduit.lueur > 0);
    assert.equal(sequenceGardien(age, { discret: true }).lueur, plein.lueur / 2);
  }
});

test('pieds et centre tombent au même point pour l’Éclaireur, le Traqueur et le gardien', async () => {
  const { ancrageEnnemi, gardienLook, SOL_ENNEMI } = await import('../../dist/engine/ennemis-visuels.js');
  for (const [nom, scale] of [['eclaireur', enemyLook('eclaireur').scale], ['traqueur', enemyLook('traqueur').scale], ['gardien', gardienLook().scale]]) {
    const a = ancrageEnnemi(scale, 515);
    assert.equal(a.y + 64 * scale, SOL_ENNEMI, `${nom} : bas de case`);
    assert.equal(a.x + 32 * scale, 515 + 64, `${nom} : centre`);
  }
});

const png = nom => {
  const b = readFileSync(new URL(`../../dist/assets/lpc/${nom}.png`, import.meta.url));
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};
const sources = JSON.parse(readFileSync(new URL('../../dist/assets/lpc/sources.json', import.meta.url), 'utf8'));
const manifeste = JSON.parse(readFileSync(new URL('../../tools/assets-manifest.json', import.meta.url), 'utf8'));
const planches = [...new Set([...ENEMY_KINDS.map(k => enemyLook(k).sheet), ...ZONE_IDS.map(z => gardienLook(z).sheet)])];

test('chaque planche d’ennemi ou de gardien est déclarée (sources, manifeste) et ses lignes tiennent dans l’image', () => {
  for (const nom of planches) {
    assert.ok(sources[`${nom}.png`], `${nom} absente de sources.json`);
    assert.ok(manifeste.fichiers.some(f => f.chemin === `assets/lpc/${nom}.png`), `${nom} absente du manifeste`);
    const r = ENEMY_SHEETS[nom], [cw, ch] = tailleCase(r), { w, h } = png(nom);
    const lignes = [r.west, r.death, ...(r.attack ? [r.west] : [])].filter(x => x != null);
    for (const l of lignes) assert.ok((l + 1) * ch <= h, `${nom} : ligne ${l} hors image`);
    const colMax = Math.max(r.cols, ...(r.attack || []).map(c => c + 1));
    assert.ok(colMax * cw <= w, `${nom} : ${colMax} colonnes de ${cw} px hors image`);
  }
});

test('chaque zone a un gardien avec une planche déclarée ; celui de la forêt est inchangé, les autres s’en distinguent', () => {
  for (const z of ZONE_IDS) assert.ok(ENEMY_SHEETS[gardienLook(z).sheet], z);
  assert.equal(gardienLook('foret').sheet, GARDIEN_LOOK.sheet);
  assert.equal(gardienLook('foret').scale, GARDIEN_LOOK.scale);
  assert.notEqual(gardienLook('ruines').sheet, gardienLook('foret').sheet);
  assert.notEqual(gardienLook('cryptes').sheet, gardienLook('ruines').sheet);
  assert.equal(gardienLook('inconnue').sheet, GARDIEN_LOOK.sheet);
});

test('chaque type des ruines et des cryptes a sa propre silhouette, plus aucun gobelin', () => {
  const autres = ENEMY_KINDS.filter(k => !['eclaireur', 'pillard', 'traqueur'].includes(k));
  assert.equal(autres.length, 6);
  assert.equal(new Set(autres.map(k => enemyLook(k).sheet)).size, 6);
  for (const k of autres) assert.ok(!enemyLook(k).sheet.startsWith('goblin'), k);
});

test('une case plus petite que 64 px reste centrée, pieds au sol, dans sa boîte d’ancrage', () => {
  for (const k of ENEMY_KINDS) {
    const look = enemyLook(k), p = placeEnnemi(look);
    assert.ok(Math.abs(p.dy + p.h - (look.rows.sol || 0) * (look.zoom || look.scale) - 64 * look.scale) < 1e-9, `${k} : pieds`);
    assert.equal(p.dx * 2 + p.w, 64 * look.scale, `${k} : centre`);
    assert.ok(p.dy >= 0, k);
  }
});

test('colonne affichée : cycle de la planche, cases d’attaque des gobelins seulement, case 0 en mouvement réduit', () => {
  const gob = ENEMY_SHEETS.goblin, bat = ENEMY_SHEETS.bat;
  assert.equal(colonneEnnemi(gob, { attaque: true, age: 650 }), 9);
  assert.equal(colonneEnnemi(gob, { attaque: true, age: 830 }), 10);
  assert.equal(colonneEnnemi(bat, { attaque: true, age: 830, t: 0 }), 0);
  assert.equal(colonneEnnemi(bat, { t: 150 * 4 }), 1);
  assert.equal(colonneEnnemi(gob, { t: 1000, reduit: true }), 0);
});
