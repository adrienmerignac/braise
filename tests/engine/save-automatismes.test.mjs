import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, fresh } from '../../dist/engine/state.js';
import { parseSave, serializeSave, importSave, isFutureSave, migrate } from '../../dist/engine/save.js';

const NOW = 1_000_000;
const lire = data => parseSave(JSON.stringify(data), NOW);
const v9 = (extra = {}) => { const { automatismes, ...r } = fresh(0); return { ...r, version: 9, last: 500, ...extra }; };
const DEBLOQUEE = { stage: 12, meilleurEtage: 12, zone: 'cryptes' };

test('schéma : la version courante est la 10', () => assert.equal(SAVE_VERSION, 10));

test('v9 → v10 : gardien éteint, même sur une partie débloquée', () => {
  for (const extra of [{}, DEBLOQUEE]) {
    const r = lire(v9(extra));
    assert.equal(r.status, 'ok');
    assert.deepEqual(r.s.automatismes, { gardien: false });
  }
  assert.deepEqual(migrate({ version: 9, gold: 1 }), { version: 10, gold: 1, automatismes: { gardien: false } });
});

test('gardien actif conservé sur une partie débloquée', () => {
  const r = lire({ ...v9(DEBLOQUEE), version: 10, automatismes: { gardien: true } });
  assert.equal(r.status, 'ok');
  assert.equal(r.s.automatismes.gardien, true);
});

test('true sur une partie non débloquée : ramené à false, réparé', () => {
  for (const etage of [1, 10]) {
    const r = lire({ ...v9({ stage: etage, meilleurEtage: etage, zone: etage > 5 ? 'ruines' : 'foret' }), version: 10, automatismes: { gardien: true } });
    assert.equal(r.status, 'repaired');
    assert.equal(r.s.automatismes.gardien, false);
  }
});

test('corruption : champ non objet → défaut, valeur non booléenne → false, clés inconnues ignorées', () => {
  for (const brut of ['oups', 3, null, [true]]) {
    const r = lire({ ...v9(DEBLOQUEE), version: 10, gold: 77, automatismes: brut });
    assert.equal(r.status, 'repaired', JSON.stringify(brut));
    assert.deepEqual(r.s.automatismes, { gardien: false });
    assert.equal(r.s.gold, 77);
  }
  const r = lire({ ...v9(DEBLOQUEE), version: 10, automatismes: { gardien: 'oui', mystere: true } });
  assert.equal(r.status, 'repaired');
  assert.deepEqual(r.s.automatismes, { gardien: false });
  assert.equal(lire({ ...v9(DEBLOQUEE), version: 10, automatismes: { gardien: true, mystere: true } }).status, 'ok');
});

test('v10 sans champ : défaut sans réparation', () => {
  const r = lire({ ...v9(), version: 10 });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.automatismes, { gardien: false });
});

test('v11 : future, jamais écrasée', () => {
  const t = JSON.stringify({ ...fresh(0), version: 11 });
  assert.equal(isFutureSave(t), true);
  assert.equal(parseSave(t, NOW).status, 'future');
});

test('export/import aller-retour identique', () => {
  const s = { ...fresh(0), ...DEBLOQUEE, automatismes: { gardien: true } };
  const r = importSave(serializeSave(s), NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.s.automatismes, { gardien: true });
  assert.equal(serializeSave(r.s), serializeSave(s));
});
