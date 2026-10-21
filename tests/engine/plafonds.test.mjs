import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate, etatAuPalier } from '../../tools/simulate.mjs';
import { fresh, cost, attack, maxHP, reward, upgradeAtMax } from '../../dist/engine/state.js';
import { UPGRADE_MAX_LEVEL } from '../../dist/engine/balance.js';
import { xpNeeded, enemyMaxHP, retaliation, victoryGold, heroDamage, assess, newFight, strike, buyUpgrade } from '../../dist/engine/combat.js';
import { offlineGains } from '../../dist/engine/offline.js';
import { parseSave, serializeSave } from '../../dist/engine/save.js';

const NOW = 1_700_000_000_000;
const BUILD = ['assaut', 'assaut', 'assaut', 'braise', 'braise', 'braise'];
const PALIERS = [1, 5, 10, 15, 27, 100, 500, 1000, 2000, 5000];
const sain = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
// Parcourt récursivement un objet et signale chaque nombre NaN, infini ou négatif.
const invalides = (v, chemin = 's') => v && typeof v === 'object'
  ? Object.entries(v).flatMap(([k, x]) => invalides(x, `${chemin}.${k}`))
  : typeof v === 'number' && !sain(v) ? [`${chemin}=${v}`] : [];
const mesures = s => {
  const f = newFight(s).f;
  return {
    attack: attack(s), maxHP: maxHP(s), reward: reward(s), xpNeeded: xpNeeded(s),
    costWeapon: cost(s, 'weapon'), costArmor: cost(s, 'armor'), costLuck: cost(s, 'luck'),
    enemy: enemyMaxHP(s, false), boss: enemyMaxHP(s, true), retaliation: retaliation(s, false), retaliationBoss: retaliation(s, true),
    gold: victoryGold(s, false), goldBoss: victoryGold(s, true), skill: heroDamage(s, false, 4), ...assess(s, { ...f, boss: true, enemyHP: enemyMaxHP(s, true) }, true),
  };
};

test('chaque palier de stress : aucune valeur NaN, infinie ou négative', () => {
  for (const etage of PALIERS) {
    const s = etatAuPalier(etage);
    assert.deepEqual(invalides(s), [], `état à l'étage ${etage}`);
    const { danger, ...nombres } = mesures(s);
    assert.deepEqual(invalides(nombres, `étage ${etage}`), []);
    // Absence de 8 h à cet étage, puis un coup : l'état reste sain.
    const absence = offlineGains(s, NOW + 8 * 3600 * 1000, undefined, {});
    assert.deepEqual(invalides(absence.s), [], `absence à l'étage ${etage}`);
    const coup = strike(s, newFight(s).f, 4, () => 0.5);
    assert.deepEqual(invalides(coup.s), [], `coup à l'étage ${etage}`);
  }
});

test('le coût reste fini au-delà du niveau maximal et l\'achat y est refusé', () => {
  for (const niveau of [UPGRADE_MAX_LEVEL, 1503, 5000, 1e6]) {
    const s = { ...fresh(0), weapon: niveau, gold: 1e300 };
    assert.ok(sain(cost(s, 'weapon')), `coût au niveau ${niveau}`);
    assert.ok(upgradeAtMax(s, 'weapon'));
    const r = buyUpgrade(s, newFight(s).f, 'weapon');
    assert.equal(r.s.weapon, niveau);
    assert.equal(r.s.gold, 1e300);
    assert.equal(r.events.length, 0);
  }
  assert.equal(upgradeAtMax({ ...fresh(0), weapon: UPGRADE_MAX_LEVEL - 1 }, 'weapon'), false);
  // Valeurs des paliers jalonnés inchangées.
  assert.equal(cost(fresh(0), 'weapon'), 24);
  assert.equal(cost({ ...fresh(0), armor: 10 }, 'armor'), Math.floor(30 * 1.6 ** 10));
});

test('coûts, vie des ennemis, rendements et expérience sont monotones', () => {
  const croissant = (nom, suite) => suite.reduce((avant, v, i) => { assert.ok(v >= avant, `${nom} baisse à l'indice ${i} (${avant} → ${v})`); return v; });
  const base = fresh(0);
  for (const k of ['weapon', 'armor', 'luck']) croissant(`coût ${k}`, Array.from({ length: 1700 }, (_, n) => cost({ ...base, [k]: n }, k)));
  croissant('xp', Array.from({ length: 3000 }, (_, n) => xpNeeded({ ...base, level: n + 1 })));
  for (const etage of [1, 2, 6, 11]) { // un étage par zone suffit pour un bestiaire donné ; la suite balaie tous les étages
    assert.ok(enemyMaxHP({ ...base, stage: etage }, true) > 0);
  }
  const etages = Array.from({ length: 2000 }, (_, n) => ({ ...base, stage: n + 1, zone: 'cryptes' }));
  croissant('PV du gardien', etages.map(s => enemyMaxHP(s, true)));
  croissant('or du gardien', etages.map(s => victoryGold(s, true)));
  croissant('rendement', etages.map(s => reward(s)));
  croissant('riposte du gardien (héros neuf)', etages.map(s => retaliation(s, true)));
  const niveaux = Array.from({ length: 2000 }, (_, n) => ({ ...base, level: n + 1 }));
  croissant('attaque par niveau', niveaux.map(attack));
  croissant('vie par niveau', niveaux.map(maxHP));
  croissant('attaque par arme', Array.from({ length: 300 }, (_, n) => attack({ ...base, weapon: n })));
});

test('progression toujours possible : un ennemi ordinaire rapporte de l\'or et de l\'expérience, sans repli, à chaque palier', () => {
  for (const etage of PALIERS) {
    const s = { ...etatAuPalier(etage), kills: 0, xp: 0 };
    let r = { s, f: newFight(s).f, events: [] };
    let coups = 0;
    while (!r.events.some(e => e.type === 'victory') && coups++ < 1000) r = strike(r.s, r.f);
    assert.ok(r.events.some(e => e.type === 'victory'), `victoire impossible à l'étage ${etage}`);
    assert.ok(!r.events.some(e => e.type === 'retreat'), `repli à l'étage ${etage}`);
    assert.ok(r.s.gold > s.gold, `aucun or gagné à l'étage ${etage}`);
    assert.ok(r.s.xp > 0 || r.s.level > s.level, `aucune expérience gagnée à l'étage ${etage}`);
    // Le coût de la moins chère des améliorations est fini : l'or gagné finit toujours par l'atteindre (ou toutes sont au maximum).
    const restantes = ['weapon', 'armor', 'luck'].filter(k => !upgradeAtMax(s, k));
    assert.ok(restantes.every(k => sain(cost(s, k))));
  }
});

test('un héros neuf à un étage élevé gagne encore de l\'or et de l\'expérience (jamais « rien à gagner »)', () => {
  for (const etage of [15, 100, 500, 2000]) {
    const s = { ...fresh(0), stage: etage, meilleurEtage: etage, zone: 'cryptes' };
    assert.ok(reward(s) > 0 && victoryGold(s, false) > 0 && sain(cost(s, 'weapon')));
    assert.ok(retaliation(s, false) >= 1, 'la riposte est au moins de 1 : pas d\'invulnérabilité');
  }
});

test('simulation patiente : aucune valeur invalide sur le trajet réel, et l\'étage monte jusqu\'à la cible', () => {
  const cible = 80;
  let mesure = 0, derniere = null, ticksSansProgres = 0, pireStagnation = 0, etage = 1;
  const r = simulate({
    politique: 'farm', build: BUILD, etageCible: cible, minutes: 1e6,
    observer: (s, f, tick) => {
      if (s.stage > etage) { etage = s.stage; ticksSansProgres = 0; } else pireStagnation = Math.max(pireStagnation, ++ticksSansProgres);
      if (tick % 2000 !== 0) return;
      mesure++;
      assert.deepEqual(invalides(s), [], `tick ${tick}`);
      assert.ok(sain(f.hp) && sain(f.enemyHP) && sain(f.enemyMax), `combat au tick ${tick}`);
      // La sauvegarde reprend l'état tel quel.
      const lu = parseSave(serializeSave(s, { hp: f.hp, boss: f.boss, enemyHP: f.enemyHP }), NOW + 1e12);
      assert.equal(lu.status, 'ok', `reprise au tick ${tick} : ${lu.status}`);
      assert.equal(lu.s.level, s.level);
      assert.equal(lu.s.stage, s.stage);
      derniere = s;
    },
  });
  assert.equal(r.stageReached, cible);
  assert.ok(mesure > 5 && derniere);
  // Même le pire mur reste franchissable : moins de 10 jours de jeu entre deux étages.
  assert.ok(pireStagnation * 1.2 < 10 * 86400, `mur de ${Math.round(pireStagnation * 1.2 / 3600)} h`);
});

test('reprise de sauvegarde : un héros de haut niveau n\'est pas ramené au niveau 1', () => {
  for (const etage of [500, 2000]) {
    const s = etatAuPalier(etage);
    assert.ok(s.level > 1000);
    const lu = parseSave(serializeSave(s, { hp: maxHP(s), boss: false, enemyHP: 10 }), NOW);
    assert.equal(lu.status, 'ok');
    assert.equal(lu.s.level, s.level);
    assert.equal(lu.s.weapon, UPGRADE_MAX_LEVEL);
    assert.equal(lu.s.stage, etage);
    assert.deepEqual(lu.s.talents, s.talents);
  }
  // Ancien comportement : le niveau 1500 était jugé invalide et réparé en niveau 1 ; une sauvegarde d'avant ce correctif n'a rien à migrer.
  const ancienne = JSON.stringify({ version: 7, ...fresh(0), level: 1500, stage: 800, meilleurEtage: 800, zone: 'cryptes', recitsLus: [], last: 0 });
  const lu = parseSave(ancienne, NOW);
  assert.equal(lu.s.level, 1500);
});
