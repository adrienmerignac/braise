import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_VERSION, fresh } from '../../dist/engine/state.js';
import { parseSave, serializeSave, importSave, isFutureSave } from '../../dist/engine/save.js';

const NOW = 1_000_000;
const v5 = (extra = {}) => ({ version: 5, gold: 321, xp: 5, level: 12, stage: 7, zone: 'ruines', meilleurEtage: 7, kills: 2, weapon: 3, armor: 2, luck: 1, last: 500,
  inventaire: [], equipe: {}, talents: { assaut: 2 }, ...extra });
const lire = data => parseSave(JSON.stringify(data), NOW);
const neufs = () => fresh(0).objectifs;

test('reprise v5 : gardien de la forêt accompli, +200 or, jamais deux fois', () => {
  const r = lire(v5());
  assert.equal(SAVE_VERSION, 9);
  assert.equal(r.s.gold, 521);
  assert.deepEqual(r.s.objectifs, { foret: { chasse: 0, faits: ['gardien'] }, ruines: { chasse: 0, faits: [] }, cryptes: { chasse: 0, faits: [] } });
  const second = lire(JSON.parse(serializeSave(r.s, NOW)));
  assert.equal(second.s.gold, 521);
  assert.deepEqual(second.s.objectifs, r.s.objectifs);
  assert.equal(r.s.talents.assaut, 2, 'le reste de la partie est conservé');
});

test('reprise v5 : plusieurs zones dépassées versent chacune leur or', () => {
  const r = lire(v5({ stage: 16, zone: 'cryptes', meilleurEtage: 16 }));
  assert.equal(r.s.gold, 321 + 200 + 600 + 1400);
  assert.deepEqual(r.s.objectifs.cryptes.faits, ['gardien']);
});

test('v5 neuve : compteurs à 0, aucun or', () => {
  const r = lire(v5({ stage: 1, zone: 'foret', meilleurEtage: 1 }));
  assert.equal(r.s.gold, 321);
  assert.deepEqual(r.s.objectifs, neufs());
});

test('champ objectifs corrompu → défaut sans perte du reste', () => {
  for (const objectifs of [null, 'x', [], { foret: { chasse: -1, faits: [] } }, { foret: { chasse: 26, faits: [] }, ruines: { chasse: 0, faits: [] }, cryptes: { chasse: 0, faits: [] } },
    { ...neufs(), foret: { chasse: 1, faits: ['inconnu'] } }, { ...neufs(), foret: { chasse: 1, faits: ['chasse', 'chasse'] } }, { ...neufs(), lune: { chasse: 0, faits: [] } }]) {
    const r = lire({ ...fresh(0), gold: 77, level: 4, objectifs, version: 6 });
    assert.deepEqual(r.s.objectifs, neufs());
    assert.equal(r.s.gold, 77);
    assert.equal(r.s.level, 4);
  }
});

test('champ objectifs absent en v6 → défaut', () => {
  const { objectifs, ...sans } = fresh(0);
  assert.deepEqual(lire({ ...sans, version: 6 }).s.objectifs, neufs());
});

test('export/import aller-retour identique ; v10 refusée comme future', () => {
  const s = { ...fresh(0), objectifs: { ...neufs(), foret: { chasse: 25, faits: ['chasse', 'gardien'] }, ruines: { chasse: 9, faits: [] } } };
  const retour = importSave(serializeSave(s, NOW), NOW);
  assert.deepEqual(retour.s.objectifs, s.objectifs);
  assert.equal(isFutureSave(JSON.stringify({ ...fresh(0), version: 10 })), true);
});
