import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, fresh } from '../../dist/engine/state.js';
import { parseSave, serializeSave, importSave, isFutureSave } from '../../dist/engine/save.js';
import { creerObjet } from '../../dist/engine/equipement.js';

const NOW = 1_000_000;
const lire = data => parseSave(JSON.stringify(data), NOW);
const v8 = (extra = {}) => { const { succes, ...r } = fresh(0); return { ...r, version: 8, last: 500, stage: 60, meilleurEtage: 60, zone: 'cryptes', ...extra }; };

test('schéma : la version courante est la 12', () => assert.equal(SAVE_VERSION, 12));

test('v8 à l’étage 60 avec un épique équipé : succès déjà remplis repris, sans événement', () => {
  const r = lire(v8({ equipe: { arme: creerObjet('arme', 'epique', 5) } }));
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.succes, ['etage25', 'etage50', 'epique']);
});

test('v8 neuve : aucun succès', () => assert.deepEqual(lire(v8({ stage: 1, meilleurEtage: 1, zone: 'foret' })).s.succes, []));

test('champ corrompu : réparé par la liste déduite, reste conservé', () => {
  const r = lire({ ...v8(), version: 9, gold: 321, succes: 'oups' });
  assert.equal(r.status, 'repaired');
  assert.deepEqual(r.s.succes, ['etage25', 'etage50']);
  assert.equal(r.s.gold, 321);
});

test('identifiants inconnus ignorés, doublons retirés', () => {
  const r = lire({ ...v8(), version: 9, succes: ['etage50', 'mystere', 'etage50', 'etage25'] });
  assert.equal(r.status, 'repaired');
  assert.deepEqual(r.s.succes, ['etage25', 'etage50']);
});

test('v9 sans champ : liste déduite, sans réparation', () => {
  const r = lire({ ...v8(), version: 9 });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.succes, ['etage25', 'etage50']);
});

test('v13 : future, jamais écrasée', () => {
  const t = JSON.stringify({ ...fresh(0), version: 13 });
  assert.equal(isFutureSave(t), true);
  assert.equal(parseSave(t, NOW).status, 'future');
});

test('export/import aller-retour identique', () => {
  const s = { ...fresh(0), succes: ['etage25', 'epique'], meilleurEtage: 30, rallumage: { eclats: 0, nombre: 0, record: 30 }, equipe: { arme: creerObjet('arme', 'epique', 2) } };
  const r = importSave(serializeSave(s), NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.s.succes, s.succes);
  assert.equal(serializeSave(r.s), serializeSave(s));
});
