import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../../dist/engine/state.js';
import { newFight, strike, gainXP, buyUpgrade } from '../../dist/engine/combat.js';

test('victoire d’un ennemi : or, expérience, kill, nouvel ennemi', () => {
  const s = fresh(0);
  const f = { ...newFight(s).f, enemyHP: 5, hp: 50 };
  const r = strike(s, f);
  assert.equal(r.s.gold, 11);
  assert.equal(r.s.xp, 10);
  assert.equal(r.s.kills, 1);
  assert.equal(r.f.hp, 58);
  assert.equal(r.f.enemyHP, r.f.enemyMax);
  assert.deepEqual(r.events.map(e => e.type), ['combat', 'victory', 'spawn']);
  assert.deepEqual(r.events[0], { type: 'combat', damage: 8, strong: false, defeated: true, boss: false, health: 0.5 });
  assert.equal(s.gold, 0, 'l’état d’entrée n’est pas modifié');
});

test('montée de niveau : surplus d’XP conservé, vitalité restaurée', () => {
  const s = { ...fresh(0), xp: 30 };
  const r = gainXP(s, { hp: 10, boss: false, enemyHP: 1, enemyMax: 1 }, 10);
  assert.equal(r.s.level, 2);
  assert.equal(r.s.xp, 5);
  assert.equal(r.f.hp, 110);
  assert.deepEqual(r.events, [{ type: 'levelup', level: 2 }]);
});

test('gardien vaincu : étage suivant ; coup non fatal : riposte et repli', () => {
  const s = { ...fresh(0), kills: 5 };
  const boss = { hp: 100, boss: true, enemyHP: 1, enemyMax: 230 };
  const w = strike(s, boss);
  assert.equal(w.s.stage, 2);
  assert.equal(w.s.kills, 0);
  assert.equal(w.s.gold, 88);
  assert.equal(w.f.boss, false);
  const hit = strike(fresh(0), { hp: 100, boss: false, enemyHP: 50, enemyMax: 50 });
  assert.equal(hit.f.hp, 96);
  const down = strike(fresh(0), { hp: 4, boss: true, enemyHP: 500, enemyMax: 500 });
  assert.deepEqual(down.events.map(e => e.type), ['combat', 'spawn', 'retreat']);
  assert.equal(down.f.hp, 100);
  assert.equal(down.f.boss, false);
});

test('achat : or insuffisant sans effet, armure soigne', () => {
  const f = { hp: 100, boss: false, enemyHP: 1, enemyMax: 1 };
  assert.deepEqual(buyUpgrade(fresh(0), f, 'armor').events, []);
  const r = buyUpgrade({ ...fresh(0), gold: 30 }, f, 'armor');
  assert.equal(r.s.gold, 0);
  assert.equal(r.s.armor, 1);
  assert.equal(r.f.hp, 135);
});
