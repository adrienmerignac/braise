import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, attack, cost, maxHP } from '../../dist/engine/state.js';
import { newFight, strike, gainXP, buyUpgrade, startBoss, retaliation } from '../../dist/engine/combat.js';

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
  assert.deepEqual(r.events[0], { type: 'combat', damage: 8, strong: false, defeated: true, boss: false, health: 0.5, taken: 0 });
  assert.equal(s.gold, 0, 'l’état d’entrée n’est pas modifié');
});

test('montée de niveau : surplus d’XP conservé, vitalité restaurée', () => {
  const s = { ...fresh(0), xp: 30 };
  const r = gainXP(s, { hp: 10, boss: false, enemyHP: 1, enemyMax: 1 }, 10);
  assert.equal(r.s.level, 2);
  assert.equal(r.s.xp, 5);
  assert.equal(r.f.hp, 110);
  assert.deepEqual(r.events, [{ type: 'levelup', level: 2, healed: 100 }]);
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

test('défaite : repli au camp, butin conservé', () => {
  const s = { ...fresh(0), gold: 50, xp: 12, kills: 3 };
  const r = strike(s, { hp: 3, boss: false, enemyHP: 40, enemyMax: 46 });
  assert.deepEqual(r.events.map(e => e.type), ['combat', 'spawn', 'retreat']);
  assert.equal(r.f.hp, 100, 'vitalité restaurée');
  assert.equal(r.f.enemyHP, r.f.enemyMax, 'nouvel ennemi');
  assert.deepEqual(r.s, s, 'or, expérience et victoires conservés');
});

test('gardien : verrouillé avant 5 victoires, ouvert à 5, victoire ouvre l’étage suivant', () => {
  const f = { hp: 100, boss: false, enemyHP: 46, enemyMax: 46 };
  const s4 = { ...fresh(0), kills: 4 };
  const verrou = startBoss(s4, f);
  assert.deepEqual(verrou.events, []);
  assert.equal(verrou.f.boss, false);
  const s5 = { ...fresh(0), kills: 5 };
  const boss = startBoss(s5, f);
  assert.deepEqual(boss.events.map(e => e.type), ['spawn', 'bossStart']);
  assert.equal(boss.f.boss, true);
  assert.equal(boss.f.enemyMax, 230);
  assert.deepEqual(startBoss(s5, boss.f).events, [], 'déjà en combat contre le gardien');
  const victoire = strike(s5, { ...boss.f, enemyHP: 8 });
  assert.equal(victoire.s.stage, 2);
  assert.equal(victoire.s.kills, 0);
  assert.equal(victoire.f.boss, false);
  assert.equal(victoire.f.enemyMax, 60, 'ennemi de l’étage 2');
  assert.deepEqual(victoire.events.map(e => e.type), ['combat', 'levelup', 'bossVictory', 'spawn']);
});

test('montée de niveau : plusieurs niveaux d’un coup', () => {
  const f = { hp: 1, boss: false, enemyHP: 1, enemyMax: 1 };
  const r = gainXP(fresh(0), f, 120);
  assert.equal(r.s.level, 3);
  assert.equal(r.s.xp, 15);
  assert.equal(r.f.hp, 120);
  assert.deepEqual(r.events, [{ type: 'levelup', level: 2, healed: 109 }, { type: 'levelup', level: 3, healed: 10 }]);
});

test('achat : coût déduit une seule fois, stat augmentée, coût suivant plus élevé', () => {
  const f = { hp: 100, boss: false, enemyHP: 1, enemyMax: 1 };
  const r = buyUpgrade({ ...fresh(0), gold: 100 }, f, 'weapon');
  assert.equal(r.s.gold, 76);
  assert.equal(r.s.weapon, 1);
  assert.equal(attack(r.s), 12);
  assert.equal(cost(r.s, 'weapon'), 38);
  assert.deepEqual(r.events, [{ type: 'upgrade', kind: 'weapon', level: 1 }]);
});

test('fonds insuffisants : état et combat inchangés', () => {
  const s = { ...fresh(0), gold: 23 };
  const f = { hp: 100, boss: false, enemyHP: 1, enemyMax: 1 };
  const r = buyUpgrade(s, f, 'weapon');
  assert.equal(r.s, s);
  assert.equal(r.f, f);
  assert.deepEqual(r.events, []);
});

test('compétence : dégâts × 4', () => {
  const f = { hp: 100, boss: false, enemyHP: 46, enemyMax: 46 };
  const r = strike(fresh(0), f, 4);
  assert.equal(r.f.enemyHP, 14);
  assert.equal(r.events[0].damage, 32);
  assert.equal(r.events[0].strong, true);
});

test('riposte : `taken` égal à retaliation et vitalité diminuée d’autant, 0 si l’ennemi meurt', () => {
  for (const boss of [false, true]) {
    const s = { ...fresh(0), stage: 3, armor: 1 };
    const r = strike(s, { hp: 100, boss, enemyHP: 500, enemyMax: 500 });
    assert.equal(r.events[0].taken, retaliation(s, boss));
    assert.equal(r.f.hp, 100 - r.events[0].taken);
  }
  assert.equal(strike(fresh(0), { hp: 50, boss: false, enemyHP: 5, enemyMax: 5 }).events[0].taken, 0);
});

test('soins : victoire bornée par la vitalité max, armure +35, niveau et gardien restaurent', () => {
  const s = fresh(0);
  const full = strike(s, { hp: 100, boss: false, enemyHP: 5, enemyMax: 5 });
  assert.equal(full.events.find(e => e.type === 'victory').healed, 0);
  const low = strike(s, { hp: 96, boss: false, enemyHP: 5, enemyMax: 5 });
  assert.equal(low.events.find(e => e.type === 'victory').healed, 4);
  assert.equal(low.f.hp, 100);
  const armor = buyUpgrade({ ...fresh(0), gold: 30 }, { hp: 100, boss: false, enemyHP: 1, enemyMax: 1 }, 'armor');
  assert.equal(armor.events[0].healed, 35);
  assert.equal(buyUpgrade({ ...fresh(0), gold: 30 }, { hp: 100, boss: false, enemyHP: 1, enemyMax: 1 }, 'weapon').events[0].healed, undefined);
  const sb = { ...fresh(0), kills: 5, level: 5 };
  const boss = strike(sb, { hp: 60, boss: true, enemyHP: 1, enemyMax: 230 });
  assert.equal(boss.events.find(e => e.type === 'bossVictory').healed, maxHP(sb) - 60);
  const lvl = strike({ ...fresh(0), kills: 5 }, { hp: 60, boss: true, enemyHP: 1, enemyMax: 230 });
  assert.equal(lvl.events.find(e => e.type === 'levelup').healed, 50, 'la montée de niveau restaure d’abord');
  assert.equal(lvl.events.find(e => e.type === 'bossVictory').healed, 0);
});

test('repli : l’événement dit qui a frappé, combien, et la vie restante de l’adversaire', () => {
  const s = fresh(0);
  const gardien = strike(s, { hp: 4, boss: true, enemyHP: 500, enemyMax: 500 });
  const retreat = gardien.events.find(e => e.type === 'retreat');
  assert.deepEqual(retreat, { type: 'retreat', boss: true, taken: retaliation(s, true), enemyHP: 492 });
  const simple = strike(s, { hp: 3, boss: false, enemyHP: 40, enemyMax: 46 });
  assert.deepEqual(simple.events.find(e => e.type === 'retreat'), { type: 'retreat', boss: false, taken: retaliation(s, false), enemyHP: 32 });
});
