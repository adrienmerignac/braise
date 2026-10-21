import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, fresh, attack, maxHP, reward } from '../../dist/engine/state.js';
import { parseSave, serializeSave, importSave, isFutureSave, migrate } from '../../dist/engine/save.js';

const NOW = 1_000_000;
const lire = data => parseSave(JSON.stringify(data), NOW);
const v11 = (extra = {}) => { const { rallumage, ...r } = fresh(0); return { ...r, version: 11, last: 500, ...extra }; };
const v12 = (rallumage, extra = {}) => ({ ...v11(extra), version: 12, rallumage });

test('schéma : la version courante est la 12, champ neuf par défaut', () => {
  assert.equal(SAVE_VERSION, 12);
  assert.deepEqual(fresh(0).rallumage, { eclats: 0, nombre: 0, record: 1 });
});

test('v11 → v12 : record = meilleur étage, statistiques identiques', () => {
  const brut = v11({ level: 30, weapon: 9, stage: 22, meilleurEtage: 25, zone: 'cryptes', talents: { assaut: 1 } });
  const avant = { ...fresh(0), ...brut };
  const r = lire(brut);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.rallumage, { eclats: 0, nombre: 0, record: 25 });
  assert.equal(attack(r.s), attack(avant)); assert.equal(maxHP(r.s), maxHP(avant)); assert.equal(reward(r.s), reward(avant));
  assert.deepEqual(migrate({ version: 11, meilleurEtage: 7 }), { version: 12, meilleurEtage: 7, rallumage: { eclats: 0, nombre: 0, record: 7 } });
});

test('champs corrompus réparés', () => {
  for (const mauvais of [null, 3, 'x', [], undefined]) {
    const r = lire(v12(mauvais, { stage: 9, meilleurEtage: 9, zone: 'ruines' }));
    assert.equal(r.status, mauvais === undefined ? 'ok' : 'repaired');
    assert.deepEqual(r.s.rallumage, { eclats: 0, nombre: 0, record: 9 });
  }
  for (const champ of ['eclats', 'nombre']) for (const v of [-1, 1.5, NaN, Infinity, '3', null, 1e12]) {
    const r = lire(v12({ eclats: 4, nombre: 2, record: 20, [champ]: v }, { stage: 20, meilleurEtage: 20, zone: 'cryptes' }));
    assert.equal(r.status, 'repaired', `${champ}=${v}`);
    assert.equal(r.s.rallumage[champ], 0);
  }
  const r = lire(v12({ eclats: 4, nombre: 2, record: 3 }, { stage: 20, meilleurEtage: 20, zone: 'cryptes' }));
  assert.equal(r.status, 'ok', 'record en retard sur le meilleur étage : relevé sans réparation');
  assert.deepEqual(r.s.rallumage, { eclats: 4, nombre: 2, record: 20 });
  assert.equal(lire(v12({ eclats: 4, nombre: 2, record: -3 }, { stage: 20, meilleurEtage: 20, zone: 'cryptes' })).status, 'repaired');
});

test('v12 valide : conservée, aller-retour export/import', () => {
  const s = { ...fresh(500), rallumage: { eclats: 8, nombre: 2, record: 50 } };
  const r = lire({ version: 12, ...s });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.rallumage, s.rallumage);
  const texte = serializeSave(s, {});
  assert.equal(JSON.parse(texte).version, 12);
  assert.deepEqual(parseSave(texte, NOW).s.rallumage, s.rallumage);
  const st = { data: {}, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; } };
  assert.equal(typeof importSave, 'function'); assert.ok(st);
});

test('v13 reste « future »', () => {
  const texte = JSON.stringify({ version: 13, ...fresh(0) });
  assert.equal(isFutureSave(texte), true);
  assert.equal(parseSave(texte, NOW).status, 'future');
});
