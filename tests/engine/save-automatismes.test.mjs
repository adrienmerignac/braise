import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, fresh } from '../../dist/engine/state.js';
import { parseSave, serializeSave, importSave, isFutureSave, migrate } from '../../dist/engine/save.js';

const NOW = 1_000_000;
const lire = data => parseSave(JSON.stringify(data), NOW);
const NEUFS = { gardien: false, achat: false };
const v9 = (extra = {}) => { const { automatismes, ...r } = fresh(0); return { ...r, version: 9, last: 500, ...extra }; };
const v11 = (extra = {}) => ({ ...v9(), version: 11, automatismes: NEUFS, ...extra });
const DEBLOQUEE = { stage: 12, meilleurEtage: 12, zone: 'cryptes' };
const DEBLOQUEE_ACHAT = { stage: 17, meilleurEtage: 17, zone: 'cryptes' };

test('schéma : la version courante est la 12', () => assert.equal(SAVE_VERSION, 12));

test('v9 → v11 : tout éteint, même sur une partie débloquée', () => {
  for (const extra of [{}, DEBLOQUEE, DEBLOQUEE_ACHAT]) {
    const r = lire(v9(extra));
    assert.equal(r.status, 'ok');
    assert.deepEqual(r.s.automatismes, NEUFS);
  }
  assert.deepEqual(migrate({ version: 9, gold: 1 }), { version: 12, gold: 1, automatismes: { gardien: false, achat: false }, rallumage: { eclats: 0, nombre: 0, record: 1 } });
});

test('v10 → v11 : achat ajouté éteint, gardien intact', () => {
  assert.deepEqual(migrate({ version: 10, automatismes: { gardien: true } }).automatismes, { gardien: true, achat: false });
  assert.equal(migrate({ version: 10, automatismes: { gardien: true } }).version, 12);
  assert.deepEqual(migrate({ version: 10, automatismes: { gardien: false } }).automatismes, NEUFS);
  assert.deepEqual(migrate({ version: 10 }).automatismes, { achat: false });
});

test('scénario de reprise : v10 avec gardien actif et meilleur étage 20 → v11 gardien actif, achat éteint', () => {
  const r = lire({ ...v9({ stage: 20, meilleurEtage: 20, zone: 'cryptes' }), version: 10, automatismes: { gardien: true } });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.automatismes, { gardien: true, achat: false });
});

test('actifs conservés sur une partie débloquée', () => {
  const r = lire(v11({ ...DEBLOQUEE_ACHAT, automatismes: { gardien: true, achat: true } }));
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.automatismes, { gardien: true, achat: true });
});

test('true sur une partie non débloquée : ramené à false, réparé', () => {
  for (const [etage, zone] of [[1, 'foret'], [10, 'ruines']]) {
    const r = lire(v11({ stage: etage, meilleurEtage: etage, zone, automatismes: { gardien: true, achat: false } }));
    assert.equal(r.status, 'repaired');
    assert.equal(r.s.automatismes.gardien, false);
  }
  for (const etage of [12, 15]) {
    const r = lire(v11({ stage: etage, meilleurEtage: etage, zone: 'cryptes', automatismes: { gardien: false, achat: true } }));
    assert.equal(r.status, 'repaired');
    assert.deepEqual(r.s.automatismes, NEUFS);
  }
});

test('corruption : champ non objet → défaut, valeur non booléenne → false, clés inconnues ignorées', () => {
  for (const brut of ['oups', 3, null, [true]]) {
    const r = lire(v11({ ...DEBLOQUEE_ACHAT, gold: 77, automatismes: brut }));
    assert.equal(r.status, 'repaired', JSON.stringify(brut));
    assert.deepEqual(r.s.automatismes, NEUFS);
    assert.equal(r.s.gold, 77);
  }
  const r = lire(v11({ ...DEBLOQUEE_ACHAT, automatismes: { gardien: 'oui', achat: 1, mystere: true } }));
  assert.equal(r.status, 'repaired');
  assert.deepEqual(r.s.automatismes, NEUFS);
  assert.equal(lire(v11({ ...DEBLOQUEE_ACHAT, automatismes: { gardien: true, achat: true, mystere: true } })).status, 'ok');
});

test('v11 sans champ : défaut sans réparation', () => {
  const { automatismes, ...sans } = v11();
  const r = lire(sans);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.automatismes, NEUFS);
});

test('v13 : future, jamais écrasée', () => {
  const t = JSON.stringify({ ...fresh(0), version: 13 });
  assert.equal(isFutureSave(t), true);
  assert.equal(parseSave(t, NOW).status, 'future');
});

test('export/import aller-retour identique', () => {
  const s = { ...fresh(0), ...DEBLOQUEE_ACHAT, automatismes: { gardien: true, achat: true }, rallumage: { eclats: 0, nombre: 0, record: 17 } };
  const r = importSave(serializeSave(s), NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.s.automatismes, { gardien: true, achat: true });
  assert.equal(serializeSave(r.s), serializeSave(s));
});
