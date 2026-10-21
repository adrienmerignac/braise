import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, loadSave, writeSave } from '../../dist/engine/save.js';
import { fresh, SAVE_KEY } from '../../dist/engine/state.js';

const NOW = 1_700_000_000_000;
const valid = { gold: 120, xp: 5, level: 3, stage: 4, kills: 2, weapon: 1, armor: 2, luck: 0, last: NOW - 1000 };
const mem = (init = {}) => ({ data: { ...init }, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } });

test('une sauvegarde valide est conservée telle quelle', () => {
  assert.deepEqual(parseSave(JSON.stringify(valid), NOW), { s: valid, status: 'ok' });
});

test('JSON illisible, null, tableau, scalaire : partie neuve', () => {
  for (const text of ['{oups', 'null', '[1,2]', '42', '"x"']) {
    assert.deepEqual(parseSave(text, NOW), { s: fresh(NOW), status: 'reset' }, text);
  }
});

test('aucune sauvegarde : partie neuve sans alerte', () => {
  assert.deepEqual(parseSave(null, NOW), { s: fresh(NOW), status: 'new' });
});

test('chaînes, NaN, Infinity, flottants : repli champ par champ', () => {
  const text = '{"gold":"999","level":null,"stage":1e999,"kills":1.5,"weapon":2,"armor":true,"luck":[3]}';
  const { s, status } = parseSave(text, NOW);
  assert.equal(status, 'repaired');
  assert.deepEqual(s, { ...fresh(NOW), weapon: 2 });
});

test('valeurs négatives ou hors bornes refusées, le reste conservé', () => {
  const { s } = parseSave(JSON.stringify({ ...valid, gold: -5, level: 0, stage: -1, kills: 6, armor: -2, luck: 1e9, last: NOW + 5000 }), NOW);
  assert.deepEqual(s, { ...fresh(NOW), xp: 5, weapon: 1 });
  for (const v of Object.values(s)) assert.ok(Number.isFinite(v) && v >= 0);
});

test('champs inconnus ignorés', () => {
  const { s } = parseSave(JSON.stringify({ ...valid, __proto__: { x: 1 }, hack: 1, extra: 'a' }), NOW);
  assert.deepEqual(s, valid);
});

test('loadSave lit via le stockage injecté', () => {
  assert.deepEqual(loadSave(mem({ [SAVE_KEY]: JSON.stringify(valid) }), NOW).s, valid);
  assert.equal(loadSave(mem(), NOW).status, 'new');
});

test('getItem qui lève : partie neuve et statut unavailable', () => {
  const storage = { getItem() { throw new Error('SecurityError'); } };
  assert.deepEqual(loadSave(storage, NOW), { s: fresh(NOW), status: 'unavailable' });
});

test('writeSave : succès, puis quota dépassé sans exception', () => {
  const storage = mem();
  assert.equal(writeSave(storage, valid), true);
  assert.deepEqual(JSON.parse(storage.data[SAVE_KEY]), valid);
  const full = { setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(writeSave(full, valid), false);
});
