import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../../dist/engine/state.js';
import { newFight, strike } from '../../dist/engine/combat.js';
import { offlineGains } from '../../dist/engine/offline.js';
import { etatObjectifs } from '../../dist/engine/objectifs.js';

// Une victoire ordinaire (ou de gardien) en un coup dans l'état donné.
const victoire = (s, boss = false) => strike(s, { ...newFight(s).f, boss, enemyHP: 1, hp: 50 });
const enchainer = (s, n) => { const events = []; for (let i = 0; i < n; i++) { const r = victoire(s); s = { ...r.s, kills: 0 }; events.push(...r.events); } return { s, events }; };
const objectifs = events => events.filter(e => e.type === 'objectif');

test('25 victoires en forêt accomplissent la chasse : 100 or versés une seule fois', () => {
  const a = enchainer(fresh(0), 24);
  assert.equal(a.s.objectifs.foret.chasse, 24);
  assert.deepEqual(objectifs(a.events), []);
  const avant = a.s.gold, r = victoire(a.s);
  assert.deepEqual(objectifs(r.events), [{ type: 'objectif', zone: 'foret', id: 'chasse', or: 100 }]);
  assert.deepEqual(r.events.map(e => e.type).slice(0, 3), ['combat', 'victory', 'objectif'], 'après l’événement de victoire');
  assert.equal(r.s.gold - avant, r.events.find(e => e.type === 'victory').gold + 100);
  const r26 = victoire(r.s);
  assert.deepEqual(objectifs(r26.events), []);
  assert.equal(r26.s.gold - r.s.gold, r26.events.find(e => e.type === 'victory').gold);
  assert.equal(r26.s.objectifs.foret.chasse, 25, 'le compteur se borne à la cible');
});

test('une victoire dans les ruines ne fait pas avancer la chasse de la forêt', () => {
  const s = { ...fresh(0), zone: 'ruines', stage: 6, meilleurEtage: 6 };
  const r = victoire(s);
  assert.equal(r.s.objectifs.ruines.chasse, 1);
  assert.equal(r.s.objectifs.foret.chasse, 0);
});

test('le gardien de l’étage 5 accomplit l’objectif gardien (200 or), une seule fois', () => {
  const s = { ...fresh(0), stage: 5, meilleurEtage: 5 };
  const r = victoire(s, true);
  assert.deepEqual(objectifs(r.events), [{ type: 'objectif', zone: 'foret', id: 'gardien', or: 200 }]);
  assert.ok(r.s.objectifs.foret.faits.includes('gardien'));
  const again = victoire({ ...r.s, stage: 5 }, true);
  assert.deepEqual(objectifs(again.events), []);
});

test('un gardien d’un autre étage n’accomplit rien', () => {
  const r = victoire({ ...fresh(0), stage: 3, meilleurEtage: 3 }, true);
  assert.deepEqual(objectifs(r.events), []);
});

test('l’absence ne change aucun compteur', () => {
  const s = { ...fresh(0), last: 0 };
  const r = offlineGains(s, 3_600_000);
  assert.ok(r.wins > 0);
  assert.deepEqual(r.s.objectifs, s.objectifs);
});

test('etatObjectifs : libellés, progrès et accomplissement', () => {
  const s = { ...fresh(0), objectifs: { ...fresh(0).objectifs, foret: { chasse: 7, faits: ['gardien'] } } };
  const e = etatObjectifs(s);
  assert.deepEqual(e.foret, [
    { id: 'chasse', libelle: 'Vaincre 25 ennemis de la zone', progres: 7, cible: 25, accompli: false, or: 100 },
    { id: 'gardien', libelle: 'Vaincre le gardien de l’étage 5', progres: 1, cible: 1, accompli: true, or: 200 },
  ]);
  assert.equal(e.cryptes[1].libelle, 'Vaincre le gardien de l’étage 15');
});
