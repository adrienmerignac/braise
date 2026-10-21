import test from 'node:test';
import assert from 'node:assert/strict';
import { ENEMY_SHEETS, ENEMY_LOOKS, enemyLook } from '../../dist/engine/ennemis-visuels.js';
import { ENEMY_KINDS } from '../../dist/engine/balance.js';

test('chaque type d’ennemi a une planche déclarée, des lignes et une échelle', () => {
  for (const kind of ENEMY_KINDS) {
    const look = enemyLook(kind);
    assert.ok(ENEMY_SHEETS[look.sheet], kind);
    assert.ok(look.scale > 0, kind);
    assert.ok(Number.isInteger(look.rows.west) && Number.isInteger(look.rows.death), kind);
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

import { gardienLook, sequenceGardien, GARDIEN_SEQUENCE as S, GARDIEN_LOOK } from '../../dist/engine/ennemis-visuels.js';

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
  assert.ok(S.coupDebut - S.reculDebut >= 30 && S.coupDebut - S.reculDebut <= 150);
  assert.ok(S.reculDebut < S.elanDebut && S.elanDebut < S.coupDebut);
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
