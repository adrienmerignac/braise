import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, attack, maxHP, reward, cost, KILLS_PER_STAGE } from '../../dist/engine/state.js';

test('fresh utilise l’horloge injectée', () => {
  assert.deepEqual(fresh(1234), { gold: 0, xp: 0, level: 1, stage: 1, zone: 'foret', meilleurEtage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1234, inventaire: [], equipe: {}, talents: {} });
  assert.equal(KILLS_PER_STAGE, 5);
});

test('état neuf', () => {
  const s = fresh(0);
  assert.equal(attack(s), 8);
  assert.equal(maxHP(s), 100);
  assert.equal(reward(s), 11);
  assert.deepEqual(['weapon', 'armor', 'luck'].map(k => cost(s, k)), [24, 30, 40]);
});

test('niveau 5', () => {
  const s = { ...fresh(0), level: 5 };
  assert.equal(attack(s), 16);
  assert.equal(maxHP(s), 140);
});

test('étage 3', () => {
  assert.equal(reward({ ...fresh(0), stage: 3 }), 17);
  assert.equal(reward({ ...fresh(0), stage: 3, luck: 2 }), 23);
});

test('améliorations niveau 2', () => {
  const s = { ...fresh(0), weapon: 2, armor: 2, luck: 2 };
  assert.equal(attack(s), 16);
  assert.equal(maxHP(s), 170);
  assert.deepEqual(['weapon', 'armor', 'luck'].map(k => cost(s, k)), [61, 76, 102]);
});
