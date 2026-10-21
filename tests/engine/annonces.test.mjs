import test from 'node:test';
import assert from 'node:assert/strict';
import { annoncePour } from '../../dist/engine/annonces.js';

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
