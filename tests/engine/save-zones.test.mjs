import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, fresh } from '../../dist/engine/state.js';
import { parseSave, migrate, serializeSave, importSave, isFutureSave } from '../../dist/engine/save.js';

const NOW = 1_000_000;
const v4 = (stage, extra = {}) => ({ version: 4, gold: 321, xp: 5, level: 12, stage, kills: 2, weapon: 3, armor: 2, luck: 1, last: 500,
  inventaire: [{ emplacement: 'arme', rarete: 'rare', niveau: 4, amelioration: 1, bonus: { attaque: 9 }, id: 7 }], equipe: {}, talents: { assaut: 2 }, ...extra });
const lire = (data, v) => parseSave(JSON.stringify(data), v ?? NOW);

test('schéma : version courante 6, partie neuve en forêt', () => {
  assert.equal(SAVE_VERSION, 9);
  assert.deepEqual([fresh(0).zone, fresh(0).meilleurEtage], ['foret', 1]);
});

test('migration v4 à l’étage 1 : forêt, meilleur étage 1, rien perdu', () => {
  const r = lire(v4(1));
  assert.equal(r.status, 'ok');
  assert.deepEqual([r.s.zone, r.s.meilleurEtage, r.s.stage], ['foret', 1, 1]);
  assert.deepEqual([r.s.gold, r.s.inventaire.length, r.s.talents], [321, 1, { assaut: 2 }]);
});

test('migration v4 à l’étage 25 : cryptes, trois zones ouvertes, même étage', () => {
  const r = lire(v4(25));
  assert.equal(r.status, 'ok');
  assert.deepEqual([r.s.zone, r.s.meilleurEtage, r.s.stage], ['cryptes', 25, 25]);
  assert.deepEqual([r.s.gold, r.s.inventaire.length, r.s.talents], [321 + 200 + 600 + 1400, 1, { assaut: 2 }]);
  assert.deepEqual(migrate(v4(25)).version, 9);
});

test('aller-retour export/import v6 identique', () => {
  const s = { ...lire(v4(8)).s, meilleurEtage: 12 };
  const texte = serializeSave(s);
  assert.equal(JSON.parse(texte).version, 9);
  const r = importSave(texte, NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.s, s);
});

test('zone inconnue ou incohérente corrigée, meilleurEtage < stage corrigé', () => {
  const base = { ...JSON.parse(serializeSave(lire(v4(8)).s)) };
  let r = lire({ ...base, zone: 'enfers' });
  assert.equal(r.status, 'repaired'); assert.equal(r.s.zone, 'ruines');
  r = lire({ ...base, zone: 'foret' });
  assert.equal(r.s.zone, 'ruines');
  r = lire({ ...base, meilleurEtage: 3 });
  assert.equal(r.status, 'repaired'); assert.equal(r.s.meilleurEtage, 8);
  r = lire({ ...base, meilleurEtage: 'x' });
  assert.equal(r.s.meilleurEtage, 8);
});

test('sauvegarde v10 : statut future', () => {
  const t = JSON.stringify({ ...v4(3), version: 10 });
  assert.equal(isFutureSave(t), true);
  assert.equal(parseSave(t, NOW).status, 'future');
});
