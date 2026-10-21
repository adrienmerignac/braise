import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, writeSave, serializeSave, importSave, migrate } from '../../dist/engine/save.js';
import { SAVE_KEY, SAVE_VERSION } from '../../dist/engine/state.js';
import { creerObjet } from '../../dist/engine/equipement.js';

const NOW = 1_700_000_000_000;
const base = { gold: 120, xp: 5, level: 7, stage: 4, zone: 'foret', meilleurEtage: 4, kills: 2, weapon: 1, armor: 2, luck: 0, last: NOW - 1000 };
const mem = (init = {}) => ({ data: { ...init }, getItem(k) { return k in this.data ? this.data[k] : null; }, setItem(k, v) { this.data[k] = v; } });
const inv = [creerObjet('armure', 'commun', 2)], eq = { arme: creerObjet('arme', 'rare', 4) };
const avecTalents = talents => parseSave(JSON.stringify({ version: 5, ...base, inventaire: inv, equipe: eq, talents }), NOW);

test('partie v3 avec inventaire et équipé : passe en v4 sans perte, talents vides, aucune réparation', () => {
  const r = parseSave(JSON.stringify({ version: 3, ...base, inventaire: inv, equipe: eq, guide: 'done', vus: [] }), NOW);
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s, { ...base, inventaire: inv, equipe: eq, talents: {} });
  assert.equal(migrate({ version: 3, ...base }).version, SAVE_VERSION);
});

test('talents valides : conservés, rangs à 0 omis', () => {
  const r = avecTalents({ assaut: 2, braise: 0 });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.s.talents, { assaut: 2 });
});

test('talents invalides ou en excès : remis à {} sans toucher au reste', () => {
  // niveau 7 : 2 points
  for (const t of [{ inconnu: 1 }, { assaut: 4 }, { assaut: -1 }, { assaut: 1.5 }, { assaut: '1' }, { assaut: 2, rempart: 1 }, [], 'x', null]) {
    const r = avecTalents(t);
    assert.equal(r.status, 'repaired', JSON.stringify(t));
    assert.deepEqual(r.s, { ...base, inventaire: inv, equipe: eq, talents: {} }, JSON.stringify(t));
  }
});

test('export puis import : les talents font l’aller-retour', () => {
  const s = { ...base, inventaire: inv, equipe: eq, talents: { assaut: 1, fortune: 1 } };
  const r = importSave(serializeSave(s, { cool: 5 }), NOW);
  assert.equal(r.ok, true);
  assert.deepEqual(r.s.talents, { assaut: 1, fortune: 1 });
});

test('recharge plus courte : `cool` reste valide et ne dépasse pas la recharge du talent', () => {
  const s = { ...base, level: 10, inventaire: [], equipe: {}, talents: { braise: 3 }, last: NOW };
  assert.equal(parseSave(serializeSave(s, { cool: 15 }), NOW).fight.cool, 9);
  assert.equal(parseSave(serializeSave(s, { cool: 4 }), NOW).fight.cool, 4);
});

test('une sauvegarde v5 n’est jamais écrasée', () => {
  const futur = JSON.stringify({ version: 6, ...base, talents: { mystere: 1 } });
  const store = mem({ [SAVE_KEY]: futur });
  assert.equal(parseSave(futur, NOW).status, 'future');
  assert.equal(writeSave(store, { ...base, inventaire: [], equipe: {}, talents: {} }), false);
  assert.equal(store.data[SAVE_KEY], futur);
});
