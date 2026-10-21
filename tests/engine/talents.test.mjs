import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, attack, maxHP, reward } from '../../dist/engine/state.js';
import { victoryGold, strike, newFight } from '../../dist/engine/combat.js';
import { offlineGains } from '../../dist/engine/offline.js';
import { pointsTalents, pointsLibres, investir, reinitialiserTalents, rechargeCompetence, soinVictoire } from '../../dist/engine/talents.js';
import { SKILL_COOLDOWN_SECONDS, HEAL_ON_VICTORY } from '../../dist/engine/balance.js';

const au = (level, talents = {}) => ({ ...fresh(0), level, talents });
const max = (id, level = 10) => ({ ...au(level), talents: { [id]: 3 } });

test('points : 0 avant le niveau 4, 1 au niveau 4 (floor((niveau − 1) / 3)), puis 1 tous les 3 niveaux', () => {
  assert.deepEqual([1, 3, 4, 6, 7, 10, 13].map(l => pointsTalents(au(l))), [0, 0, 1, 1, 2, 3, 4]);
});

test('investir : refusé sans point libre, au rang max ou pour un talent inconnu ; un point non dépensé reste', () => {
  const s = au(1);
  assert.equal(investir(s, 'assaut'), s);
  let t = au(7);
  t = investir(investir(t, 'assaut'), 'assaut');
  assert.equal(pointsLibres(t), 0);
  assert.equal(investir(t, 'rempart'), t);
  let u = au(13);
  for (let i = 0; i < 3; i++) u = investir(u, 'assaut');
  assert.equal(investir(u, 'assaut'), u);
  assert.equal(pointsLibres(u), 1);
  assert.equal(investir(u, 'inconnu'), u);
  assert.equal(pointsLibres(investir(au(4), 'fortune')), 0);
});

test('assaut : +10 % d’attaque par rang', () => {
  const s = au(10), b = attack(s);
  assert.equal(b, 26);
  assert.deepEqual([1, 2, 3].map(r => attack({ ...s, talents: { assaut: r } })), [29, 31, 34]);
});

test('rempart : +8 % de vie max et +3 de soin par victoire par rang', () => {
  const s = au(10), b = maxHP(s);
  assert.equal(b, 190);
  assert.deepEqual([1, 2, 3].map(r => maxHP({ ...s, talents: { rempart: r } })), [205, 220, 236]);
  assert.equal(soinVictoire(s), HEAL_ON_VICTORY);
  assert.equal(soinVictoire(max('rempart')), HEAL_ON_VICTORY + 9);
});

test('rempart : le soin de victoire passe par le combat', () => {
  const soin = s => {
    const f = { ...newFight(s).f, hp: 10, enemyHP: 1 };
    return strike(s, f).events.find(e => e.type === 'victory').healed;
  };
  assert.equal(soin(au(1)), HEAL_ON_VICTORY);
  assert.equal(soin(max('rempart', 1)), HEAL_ON_VICTORY + 9);
});

test('fortune : +10 % d’or de victoire par rang, sans autre effet', () => {
  const s = au(1);
  assert.equal(reward(s), 11);
  assert.deepEqual([1, 2, 3].map(r => reward({ ...s, talents: { fortune: r } })), [12, 13, 14]);
  assert.ok(victoryGold(max('fortune', 1), false) > victoryGold(s, false));
  assert.equal(attack(max('fortune')), attack(au(10)));
});

test('braise : recharge −2 s par rang (15 s → 9 s)', () => {
  assert.equal(rechargeCompetence(au(1)), SKILL_COOLDOWN_SECONDS);
  assert.deepEqual([1, 2, 3].map(r => rechargeCompetence({ ...au(1), talents: { braise: r } })), [13, 11, 9]);
});

test('réinitialisation : tous les rangs à 0, tous les points rendus, gratuite', () => {
  let s = { ...au(10), gold: 50 };
  for (const id of ['assaut', 'rempart', 'fortune']) s = investir(s, id);
  assert.equal(pointsLibres(s), 0);
  const r = reinitialiserTalents(s);
  assert.deepEqual(r.talents, {});
  assert.equal(pointsLibres(r), 3);
  assert.equal(r.gold, 50);
  assert.equal(attack(r), attack(au(10)));
});

test('absence : les gains d’or sont plus élevés avec fortune (et l’attaque plus rapide avec assaut)', () => {
  const now = 3_600_000, base = { ...au(10), last: 0 };
  const sans = offlineGains(base, now), avec = offlineGains({ ...base, talents: { fortune: 3 } }, now);
  assert.ok(avec.gold > sans.gold, `${avec.gold} > ${sans.gold}`);
  assert.ok(offlineGains({ ...base, talents: { assaut: 3 } }, now).wins >= sans.wins);
});
