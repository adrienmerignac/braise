import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, loadSave, writeSave, migrate, serializeSave, importSave } from '../../dist/engine/save.js';
import { fresh, SAVE_KEY, LEGACY_SAVE_KEY } from '../../dist/engine/state.js';

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
  assert.deepEqual(JSON.parse(storage.data[SAVE_KEY]), { version: 2, ...valid });
  const full = { setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(writeSave(full, valid), false);
});

const v1 = { gold: 5000, xp: 40, level: 12, stage: 30, kills: 3, weapon: 9, armor: 7, luck: 4, last: NOW - 60_000 };

test('migrate : braise-v1 complet converti sans perte, entrée non modifiée', () => {
  const copie = { ...v1 };
  assert.deepEqual(migrate(v1), { ...v1, version: 2 });
  assert.deepEqual(v1, copie);
  assert.deepEqual(migrate({ version: 2, gold: 1 }), { version: 2, gold: 1 });
  assert.equal(migrate(null), null);
});

test('loadSave : v1 complet repris, écrit en v2, ancienne clé conservée', () => {
  const storage = mem({ [LEGACY_SAVE_KEY]: JSON.stringify(v1) });
  const r = loadSave(storage, NOW);
  assert.deepEqual(r, { s: v1, status: 'ok' });
  assert.deepEqual(JSON.parse(storage.data[SAVE_KEY]), { version: 2, ...v1 });
  assert.equal(storage.data[LEGACY_SAVE_KEY], JSON.stringify(v1));
});

test('loadSave : v1 partiel migré, champs manquants par défaut, valeurs présentes gardées', () => {
  const storage = mem({ [LEGACY_SAVE_KEY]: JSON.stringify({ gold: 77, stage: 8 }) });
  const r = loadSave(storage, NOW);
  assert.equal(r.status, 'repaired');
  assert.deepEqual(r.s, { ...fresh(NOW), gold: 77, stage: 8 });
  assert.equal(JSON.parse(storage.data[SAVE_KEY]).gold, 77);
});

test('loadSave : braise-v2 prioritaire sur braise-v1 ; v2 illisible retombe sur v1', () => {
  const v2 = { ...v1, gold: 1 };
  assert.equal(loadSave(mem({ [SAVE_KEY]: serializeSave(v2), [LEGACY_SAVE_KEY]: JSON.stringify(v1) }), NOW).s.gold, 1);
  assert.deepEqual(loadSave(mem({ [SAVE_KEY]: '{oups', [LEGACY_SAVE_KEY]: JSON.stringify(v1) }), NOW).s, v1);
  assert.equal(loadSave(mem({ [LEGACY_SAVE_KEY]: '{oups' }), NOW).status, 'reset');
});

test('version inconnue : refusée', () => {
  assert.equal(parseSave(JSON.stringify({ ...v1, version: 3 }), NOW).status, 'reset');
  assert.equal(parseSave(JSON.stringify({ ...v1, version: '2' }), NOW).status, 'reset');
});

test('aller-retour export/import identique', () => {
  const r = importSave(serializeSave(v1), NOW);
  assert.deepEqual(r, { ok: true, s: v1 });
  assert.equal(serializeSave(r.s), serializeSave(v1));
});

test('import : un export v1 brut est accepté, un fichier corrompu ou altéré est refusé', () => {
  assert.equal(importSave(JSON.stringify(v1), NOW).ok, true);
  for (const text of ['{oups', '', 'null', '[]', serializeSave({ ...v1, gold: -1 }), serializeSave({ ...v1, level: 'x' }), JSON.stringify({ version: 2 })]) {
    assert.deepEqual(importSave(text, NOW), { ok: false }, text);
  }
});
