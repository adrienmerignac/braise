import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave } from '../../dist/engine/save.js';
import { fresh, attack, cost, reward, maxHP, KILLS_PER_STAGE } from '../../dist/engine/state.js';
import { enemyKind, heroDamage, bossName, modificateurTexte, enemyMaxHP, victoryGold, restoreFight, newFight, strike, gainXP, buyUpgrade, startBoss, retaliation, XP_BOSS, BOSS_GOLD_MULT, assess, assessGuardian } from '../../dist/engine/combat.js';

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
  assert.deepEqual(r.events[0], { type: 'combat', damage: 8, strong: false, defeated: true, boss: false, kind: 'eclaireur', health: 0.5, taken: 0 });
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
  assert.equal(victoire.f.enemyMax, 42, 'Pillard de l’étage 2 : 60 × 0,7');
  assert.deepEqual(victoire.events.map(e => e.type), ['combat', 'levelup', 'bossVictory', 'spawn']);
  const bv = victoire.events.find(e => e.type === 'bossVictory');
  assert.deepEqual(bv, { type: 'bossVictory', stage: 2, gold: reward(s5) * BOSS_GOLD_MULT, xp: XP_BOSS, healed: 0 });
  assert.equal(victoire.events.at(-1).boss, false, 'le spawn suivant n’est pas un gardien');
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

test('assess : Sûr, Serré, Mortel selon coups pour vaincre et encaissables', () => {
  const s = fresh(0); // attaque 8, riposte 4, ennemi de 46 PV → 6 coups pour vaincre
  const base = { boss: false, enemyHP: 46, enemyMax: 46 };
  assert.deepEqual(assess(s, { ...base, hp: 100 }), { attack: 8, hitsToWin: 6, hitsToSurvive: 25, hitsAbsorbed: 24, danger: 'Sûr' });
  assert.deepEqual(assess(s, { ...base, hp: 40 }), { attack: 8, hitsToWin: 6, hitsToSurvive: 10, hitsAbsorbed: 9, danger: 'Serré' });
  assert.deepEqual(assess(s, { ...base, hp: 20 }), { attack: 8, hitsToWin: 6, hitsToSurvive: 5, hitsAbsorbed: 4, danger: 'Mortel' });
});

test('assess : bornes exactes des seuils', () => {
  const s = fresh(0);
  const base = { boss: false, enemyHP: 46, enemyMax: 46 };
  assert.equal(assess(s, { ...base, hp: 24 }).danger, 'Serré'); // 6 ripostes pour tomber = 6 coups pour vaincre : pas Mortel
  assert.equal(assess(s, { ...base, hp: 20 }).danger, 'Mortel');
  assert.equal(assess(s, { ...base, hp: 48 }).danger, 'Sûr'); // 12 = 2 × 6 : Sûr
  assert.equal(assess(s, { ...base, hp: 44 }).danger, 'Serré');
});

test('assess : coups encaissés sans tomber (88 PV, riposte 4 → 21)', () => {
  const r = assess(fresh(0), { boss: false, hp: 88, enemyHP: 46, enemyMax: 46 });
  assert.equal(r.hitsToSurvive, 22);
  assert.equal(r.hitsAbsorbed, 21);
});

test('assess : ennemi à 1 PV et riposte minimale de 1', () => {
  const s = { ...fresh(0), armor: 100 }; // riposte plafonnée à 1
  const r = assess(s, { boss: false, hp: 50, enemyHP: 1, enemyMax: 46 });
  assert.equal(r.hitsToWin, 1);
  assert.equal(r.hitsToSurvive, 50);
  assert.equal(r.hitsAbsorbed, 49);
  assert.equal(r.danger, 'Sûr');
});

test('assessGuardian : gardien à PV pleins contre héros à vitalité pleine', () => {
  const r = assessGuardian(fresh(0)); // 230 PV, attaque 8, riposte 11, vitalité 100
  assert.deepEqual(r, { attack: 8, hitsToWin: 29, hitsToSurvive: 10, hitsAbsorbed: 9, danger: 'Mortel' });
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

// --- Catalogue d'ennemis de forêt ---
test('ennemis : 6 victoires de suite donnent Éclaireur, Pillard, Traqueur, Éclaireur, Pillard, puis Pillard après le changement d’étage', () => {
  let s = { ...fresh(0), level: 20 }, f = newFight(s).f; // niveau haut : aucun repli
  assert.equal(enemyKind(s), 'eclaireur', 'étage 1 sans victoire');
  const vus = [];
  for (let i = 0; i < 6; i++) {
    const r = strike(s, { ...f, enemyHP: 1 });
    vus.push(r.events.find(e => e.type === 'combat').kind);
    assert.equal(r.events.find(e => e.type === 'spawn').kind, enemyKind(r.s), 'le spawn annonce le type suivant');
    ({ s, f } = r);
    if (s.kills >= KILLS_PER_STAGE) s = { ...s, stage: s.stage + 1, kills: 0 }; // le gardien est hors sujet ici
  }
  // Le changement d'étage décale la boucle : la 6e victoire (étage 2, 0 victoire) tombe sur (2 − 1 + 0) % 3 = Pillard.
  assert.deepEqual(vus, ['eclaireur', 'pillard', 'traqueur', 'eclaireur', 'pillard', 'pillard']);
});

test('ennemis : PV, riposte et or de chaque type aux étages 1 et 5', () => {
  // armure 0, sans charme : PV 32 + 14 × étage ; riposte 3 + 1,4 × étage ; or 8 + 3 × étage
  const attendu = [
    [1, 0, 'eclaireur', 46, 4, 11], [1, 1, 'pillard', 32, 6, 13], [1, 2, 'traqueur', 59, 3, 14],
    [5, 2, 'eclaireur', 102, 10, 23], [5, 3, 'pillard', 71, 14, 27], [5, 4, 'traqueur', 132, 8, 29],
  ];
  for (const [stage, kills, kind, hp, ret, gold] of attendu) {
    const place = { ...fresh(0), stage, kills };
    assert.equal(enemyKind(place), kind);
    assert.equal(enemyMaxHP(place, false), hp, `${kind} étage ${stage} : PV`);
    assert.equal(retaliation(place, false), ret, `${kind} étage ${stage} : riposte`);
    assert.equal(victoryGold(place, false), gold, `${kind} étage ${stage} : or`);
  }
});

test('ennemis : le gardien ignore le type', () => {
  for (const kills of [0, 1, 2]) {
    const s = { ...fresh(0), stage: 5, kills };
    assert.equal(enemyMaxHP(s, true), (32 + 14 * 5) * 5);
    assert.equal(retaliation(s, true), Math.floor(10 + 5 * 1.4));
    assert.equal(victoryGold(s, true), reward(s) * BOSS_GOLD_MULT);
  }
});

test('ennemis : le danger affiché suit la riposte du type courant', () => {
  const p = { ...fresh(0), stage: 5, kills: 3 }; // (5 − 1 + 3) % 3 = 1 → Pillard
  assert.equal(enemyKind(p), 'pillard');
  assert.equal(assess(p, { ...newFight(p).f, hp: 100 }).hitsToSurvive, Math.ceil(100 / 14));
  assert.equal(assessGuardian(p).hitsToSurvive, Math.ceil(maxHP(p) / retaliation(p, true)));
});

test('ennemis : une sauvegarde braise-v2 existante recharge le même type et des PV valides', () => {
  const brut = JSON.stringify({ gold: 40, xp: 3, level: 1, stage: 3, kills: 2, weapon: 1, armor: 0, luck: 0, last: 1000, boss: false, enemyHP: 50 });
  const { s, fight, status } = parseSave(brut, 2000);
  assert.equal(status, 'ok');
  assert.equal(enemyKind(s), 'pillard', '(3 − 1 + 2) % 3 = 1');
  const f = restoreFight(s, fight);
  assert.equal(f.enemyMax, Math.floor((32 + 14 * 3) * 0.7));
  assert.equal(f.enemyMax, enemyMaxHP(s, false));
  const ancien = parseSave(JSON.stringify({ ...JSON.parse(brut), enemyHP: 74 }), 2000);
  assert.equal(ancien.status, 'ok', 'PV d’avant les types (32 + 14 × 3 = 74) : partie saine');
  const fa = restoreFight(ancien.s, ancien.fight);
  assert.equal(fa.enemyHP, 51);
  assert.equal(fa.enemyMax, 51);
  assert.equal(parseSave(JSON.stringify({ ...JSON.parse(brut), enemyHP: 75 }), 2000).status, 'repaired', 'au-dessus du maximum de base : réparé');
  assert.equal(parseSave(JSON.stringify({ ...JSON.parse(brut), enemyHP: 50.5 }), 2000).status, 'repaired', 'non entier : réparé');
  const eclaireur = { ...JSON.parse(brut), stage: 1, kills: 0, enemyHP: 46 };
  const r = parseSave(JSON.stringify(eclaireur), 2000);
  assert.equal(r.status, 'ok');
  assert.equal(restoreFight(r.s, r.fight).enemyMax, 46, 'Éclaireur inchangé');
});

// --- Bestiaire par zone (M4.3a) ---
test('bestiaire : la forêt garde ses PV, riposte, or et son ordre aux étages 1 à 5', () => {
  const attendu = { eclaireur: [1, 1, 1], pillard: [0.7, 1.4, 1.2], traqueur: [1.3, 0.8, 1.3] };
  const ordre = ['eclaireur', 'pillard', 'traqueur'];
  for (let stage = 1; stage <= 5; stage++) for (let kills = 0; kills < 5; kills++) {
    const s = { ...fresh(0), stage, kills }, kind = enemyKind(s), [hp, ret, or] = attendu[kind];
    assert.equal(kind, ordre[(stage - 1 + kills) % 3]);
    assert.equal(enemyMaxHP(s, false), Math.floor((32 + 14 * stage) * hp));
    assert.equal(retaliation(s, false), Math.max(1, Math.floor((3 + stage * 1.4) * ret - 0)));
    assert.equal(victoryGold(s, false), Math.floor((8 + 3 * stage) * or));
  }
});

test('bestiaire : ruines et cryptes ont leurs types, PV, riposte et or', () => {
  const cas = [
    ['ruines', 6, ['squelette-ruines', 'chauve-souris', 'gelee'], [1.1, 0.6, 1.5], [1, 1.5, 0.7], [1.1, 1.2, 1.3]],
    ['cryptes', 11, ['squelette-cendre', 'spectre', 'goule'], [1.2, 0.8, 1.4], [1.1, 1.6, 1.2], [1.2, 1.3, 1.4]],
  ];
  for (const [zone, stage, types, hps, rets, golds] of cas) types.forEach((kind, i) => {
    const s = { ...fresh(0), zone, stage: stage + 0, kills: (3 - ((stage - 1) % 3) + i) % 3 };
    assert.equal(enemyKind(s), kind);
    assert.equal(enemyMaxHP(s, false), Math.floor((32 + 14 * stage) * hps[i]));
    assert.equal(retaliation(s, false), Math.max(1, Math.floor((3 + stage * 1.4) * rets[i])));
    assert.equal(victoryGold(s, false), Math.floor((8 + 3 * stage) * golds[i]));
  });
});

test('bestiaire : le squelette prend ×0,75 en attaque auto et ×1,5 sur la braise, au moins 1', () => {
  const s = { ...fresh(0), zone: 'ruines', stage: 6, kills: 1 }; // attaque 8
  assert.equal(enemyKind(s), 'squelette-ruines');
  const f = { hp: 100, boss: false, enemyHP: 1000, enemyMax: 1000 };
  assert.equal(strike(s, f).events[0].damage, 6);
  assert.equal(strike(s, f, 4).events[0].damage, 48);
  assert.equal(heroDamage({ ...s, level: 1 }, false), 6);
  const gelee = { ...s, kills: 0 };
  assert.equal(enemyKind(gelee), 'gelee');
  assert.equal(strike(gelee, f).events[0].damage, 8);
  assert.equal(strike(gelee, f, 4).events[0].damage, 19);
  assert.ok(heroDamage({ ...s, zone: 'cryptes', stage: 11 }, false) >= 1);
  assert.equal(strike(s, { ...f, boss: true }).events[0].damage, 8, 'le gardien ne porte aucun modificateur');
});

test('bestiaire : chaque gardien a son nom et garde PV ×5 / or ×8', () => {
  for (const [zone, stage, nom] of [['foret', 1, 'Le Gardien de braise'], ['ruines', 6, 'Sentinelle engloutie'], ['cryptes', 11, 'Gardien des cendres']]) {
    const s = { ...fresh(0), zone, stage };
    assert.equal(bossName(s), nom);
    assert.equal(enemyMaxHP(s, true), (32 + 14 * stage) * 5);
    assert.equal(victoryGold(s, true), (8 + 3 * stage) * 8);
  }
});

test('bestiaire : zone inconnue = forêt ; reprise en ruines avec PV ennemis au-dessus du maximum', () => {
  assert.equal(enemyKind({ ...fresh(0), zone: 'inconnue' }), 'eclaireur');
  const s = { ...fresh(0), zone: 'ruines', stage: 6, kills: 1 };
  const f = restoreFight(s, { hp: 50, boss: false, enemyHP: 99999 });
  assert.equal(f.enemyMax, enemyMaxHP(s, false));
  assert.ok(f.enemyHP <= f.enemyMax, 'PV bornés au maximum');
  assert.ok(Number.isFinite(strike(s, f).f.enemyHP));
  assert.equal(modificateurTexte(s), 'Résiste aux coups · vulnérable à la braise');
});
