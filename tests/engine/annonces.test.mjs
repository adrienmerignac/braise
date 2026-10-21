import test from 'node:test';
import assert from 'node:assert/strict';
import { annoncePour, annoncesPour, texteGardienVaincu } from '../../dist/engine/annonces.js';

test('une victoire ordinaire, un coup ou une apparition ne sont pas annoncés', () => {
  for (const type of ['victory', 'combat', 'spawn', 'bossStart', 'upgrade']) assert.equal(annoncePour({ type, gold: 5, xp: 3, damage: 4 }), null);
  assert.equal(annoncePour(undefined), null);
});

test('défaite, gardien vaincu, niveau et achat impossible produisent un texte', () => {
  assert.match(annoncePour({ type: 'retreat', boss: true, taken: 12, enemyHP: 30.2 }), /Repli : le gardien.*12.*31 PV/);
  assert.match(annoncePour({ type: 'retreat', boss: false, taken: 3, enemyHP: 0 }), /l’ennemi/);
  assert.match(annoncePour({ type: 'bossVictory', stage: 4 }), /Gardien vaincu.*étage 4/);
  assert.match(annoncePour({ type: 'levelup', level: 7 }), /Niveau 7/);
  assert.match(annoncePour({ type: 'achatImpossible' }), /Achat impossible/);
});

test('les annonces d’un même run sont concaténées en une seule', () => {
  const evs = [{ type: 'victory' }, { type: 'bossVictory', stage: 4 }, { type: 'levelup', level: 7 }];
  assert.equal(annoncesPour(evs), 'Gardien vaincu ! L’étage 4 s’ouvre. Niveau 7 atteint.');
  assert.equal(annoncesPour([{ type: 'victory' }]), null);
  assert.equal(annoncesPour([]), null);
});

test('le texte du gardien vaincu distingue zone ouverte, étage atteint et fin de zone', () => {
  const ouverte = { type: 'bossVictory', stage: 5, plafond: true, zoneOuverte: 'ruines' };
  assert.equal(texteGardienVaincu(ouverte), 'Gardien vaincu ! Les Ruines englouties s’ouvrent : ouvrez la carte pour y voyager.');
  assert.equal(annoncePour(ouverte), texteGardienVaincu(ouverte));
  assert.equal(texteGardienVaincu({ type: 'bossVictory', stage: 3 }), 'Gardien vaincu ! L’étage 3 s’ouvre.');
  const fin = { type: 'bossVictory', stage: 5, plafond: true };
  assert.equal(texteGardienVaincu(fin), 'Gardien vaincu ! Fin de la zone : la suite se rejoint par la carte.');
  assert.doesNotMatch(annoncePour(fin), /s’ouvre\./);
});

test('un objectif accompli est annoncé ; dix victoires sans accomplissement ne le sont pas', () => {
  assert.equal(annoncePour({ type: 'objectif', zone: 'foret', id: 'chasse', or: 100 }), 'Objectif accompli : Forêt des Murmures — 25 ennemis vaincus, +100 or.');
  assert.match(annoncePour({ type: 'objectif', zone: 'ruines', id: 'gardien', or: 600 }), /gardien de l’étage 10 vaincu, \+600 or/);
  const victoires = Array.from({ length: 10 }, () => ({ type: 'victory', gold: 5, xp: 3 }));
  assert.equal(annoncesPour(victoires), null);
});
