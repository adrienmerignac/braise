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
