import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, fresh } from '../../dist/engine/state.js';
import { parseSave, serializeSave, importSave } from '../../dist/engine/save.js';

const NOW = 1_000_000;
const v6 = (extra = {}) => ({ ...fresh(0), version: 6, last: 500, ...extra });
const sans = o => { const { recitsLus, ...r } = o; return r; };
const lire = data => parseSave(JSON.stringify(data), NOW);

test('reprise v6 à l’étage 12 : braise, ruines, cryptes lus, cendres non débloqué', () => {
  const r = lire(sans(v6({ stage: 12, zone: 'cryptes', meilleurEtage: 12 })));
  assert.equal(SAVE_VERSION, 7);
  assert.deepEqual(r.s.recitsLus, ['braise', 'ruines', 'cryptes']);
});

test('partie v6 neuve : recitsLus vide', () => {
  const r = lire(sans(v6()));
  assert.deepEqual(r.s.recitsLus, []);
});

test('partie v7 neuve : recitsLus vide', () => {
  const r = lire({ ...fresh(0), version: 7, last: 500 });
  assert.deepEqual(r.s.recitsLus, []);
  assert.equal(r.status, 'ok');
});

test('valeurs invalides réparées, inconnus et doublons retirés', () => {
  for (const v of ['x', 3, null, {}]) {
    const r = lire({ ...fresh(0), version: 7, last: 500, recitsLus: v });
    assert.equal(r.status, 'repaired');
    assert.ok(Array.isArray(r.s.recitsLus));
  }
  const r = lire({ ...fresh(0), version: 7, last: 500, recitsLus: ['ruines', 'ruines', 'lune', 'braise'] });
  assert.deepEqual(r.s.recitsLus, ['braise', 'ruines']);
});

test('export/import aller-retour identique', () => {
  const s = { ...fresh(0), meilleurEtage: 12, recitsLus: ['braise', 'ruines'] };
  assert.deepEqual(importSave(serializeSave(s, NOW), NOW).s.recitsLus, ['braise', 'ruines']);
});
