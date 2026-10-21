import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, attack, cost } from '../../dist/engine/state.js';
import { newFight, strike, gainXP, buyUpgrade, startBoss, assess, assessGuardian } from '../../dist/engine/combat.js';

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
  assert.deepEqual(r.events, [{ type: 'levelup', level: 2 }, { type: 'levelup', level: 3 }]);
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

test('assess : Sûr, Serré, Mortel selon coups pour vaincre et encaissables', () => {
  const s = fresh(0); // attaque 8, riposte 4, ennemi de 46 PV → 6 coups pour vaincre
  const base = { boss: false, enemyHP: 46, enemyMax: 46 };
  assert.deepEqual(assess(s, { ...base, hp: 100 }), { attack: 8, hitsToWin: 6, hitsToSurvive: 25, danger: 'Sûr' });
  assert.deepEqual(assess(s, { ...base, hp: 40 }), { attack: 8, hitsToWin: 6, hitsToSurvive: 10, danger: 'Serré' });
  assert.deepEqual(assess(s, { ...base, hp: 20 }), { attack: 8, hitsToWin: 6, hitsToSurvive: 5, danger: 'Mortel' });
});

test('assess : bornes exactes des seuils', () => {
  const s = fresh(0);
  const base = { boss: false, enemyHP: 46, enemyMax: 46 };
  assert.equal(assess(s, { ...base, hp: 24 }).danger, 'Serré'); // 6 encaissables = 6 coups : pas Mortel
  assert.equal(assess(s, { ...base, hp: 20 }).danger, 'Mortel');
  assert.equal(assess(s, { ...base, hp: 48 }).danger, 'Sûr'); // 12 = 2 × 6 : Sûr
  assert.equal(assess(s, { ...base, hp: 44 }).danger, 'Serré');
});

test('assess : ennemi à 1 PV et riposte minimale de 1', () => {
  const s = { ...fresh(0), armor: 100 }; // riposte plafonnée à 1
  const r = assess(s, { boss: false, hp: 50, enemyHP: 1, enemyMax: 46 });
  assert.equal(r.hitsToWin, 1);
  assert.equal(r.hitsToSurvive, 50);
  assert.equal(r.danger, 'Sûr');
});

test('assessGuardian : gardien à PV pleins contre héros à vitalité pleine', () => {
  const r = assessGuardian(fresh(0)); // 230 PV, attaque 8, riposte 11, vitalité 100
  assert.deepEqual(r, { attack: 8, hitsToWin: 29, hitsToSurvive: 10, danger: 'Mortel' });
});
