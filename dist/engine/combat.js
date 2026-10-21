// Récompenses et résolution de combat : fonctions pures, sans DOM ni horloge.
// `s` est l'état persisté (schéma braise-v1) ; `f` l'état de combat, non persisté : { hp, boss, enemyHP, enemyMax }.
// Chaque fonction renvoie { s, f, events } sans modifier ses arguments ; game.js applique les événements.
import { KILLS_PER_STAGE, attack, maxHP, reward, cost } from './state.js';
import {
  XP_PER_LEVEL, XP_ENEMY, XP_BOSS, BOSS_GOLD_MULT, BOSS_HP_MULT, HEAL_ON_VICTORY, HEAL_ON_ARMOR, ENEMY_BASE_HP, ENEMY_HP_PER_STAGE,
  RETALIATION_BASE, RETALIATION_BOSS_BASE, RETALIATION_PER_STAGE, RETALIATION_ARMOR_REDUCTION,
} from './balance.js';

export {
  XP_PER_LEVEL, XP_ENEMY, XP_BOSS, BOSS_GOLD_MULT, BOSS_HP_MULT, HEAL_ON_VICTORY, HEAL_ON_ARMOR, ENEMY_BASE_HP, ENEMY_HP_PER_STAGE,
};

export const xpNeeded = s => s.level * XP_PER_LEVEL;
export const enemyMaxHP = (s, boss) => Math.floor((ENEMY_BASE_HP + s.stage * ENEMY_HP_PER_STAGE) * (boss ? BOSS_HP_MULT : 1));
export const retaliation = (s, boss) => Math.max(1, Math.floor((boss ? RETALIATION_BOSS_BASE : RETALIATION_BASE) + s.stage * RETALIATION_PER_STAGE - s.armor * RETALIATION_ARMOR_REDUCTION));

export function gainXP(s, f, n) {
  s = { ...s, xp: s.xp + n };
  const events = [];
  while (s.xp >= xpNeeded(s)) {
    s.xp -= xpNeeded(s);
    s.level++;
    f = { ...f, hp: maxHP(s) };
    events.push({ type: 'levelup', level: s.level });
  }
  return { s, f, events };
}

export function spawn(s, f, boss = f.boss) {
  const enemyMax = enemyMaxHP(s, boss);
  return { s, f: { ...f, boss, enemyHP: enemyMax, enemyMax }, events: [{ type: 'spawn', boss }] };
}

export function newFight(s) {
  return spawn(s, { hp: maxHP(s), boss: false, enemyHP: 0, enemyMax: 0 });
}

// Reconstruit l'état de combat depuis les champs persistés (voir save.js) ; défauts : vie pleine, nouvel ennemi.
// Retourne seulement `f` : l'appelant émet lui-même l'événement d'apparition pour la scène.
export function restoreFight(s, saved = {}) {
  const hp = saved.hp ?? maxHP(s);
  if (saved.enemyHP === undefined) return { ...newFight(s).f, hp };
  return { hp, boss: saved.boss, enemyHP: saved.enemyHP, enemyMax: enemyMaxHP(s, saved.boss) };
}

export function startBoss(s, f) {
  if (s.kills < KILLS_PER_STAGE || f.boss) return { s, f, events: [] };
  const r = spawn(s, { ...f, hp: maxHP(s) }, true);
  return { ...r, events: [...r.events, { type: 'bossStart' }] };
}

export function buyUpgrade(s, f, kind) {
  if (s.gold < cost(s, kind)) return { s, f, events: [] };
  s = { ...s, gold: s.gold - cost(s, kind), [kind]: s[kind] + 1 };
  if (kind === 'armor') f = { ...f, hp: f.hp + HEAL_ON_ARMOR };
  return { s, f, events: [{ type: 'upgrade', kind, level: s[kind] }] };
}

export function strike(s, f, mult = 1) {
  const damage = attack(s) * mult;
  const enemyHP = f.enemyHP - damage;
  const defeated = enemyHP <= 0;
  const events = [{ type: 'combat', damage, strong: mult > 1, defeated, boss: f.boss, health: f.hp / maxHP(s) }];
  f = { ...f, enemyHP };
  if (defeated) {
    const wonBoss = f.boss;
    const gold = reward(s) * (wonBoss ? BOSS_GOLD_MULT : 1);
    s = { ...s, gold: s.gold + gold };
    const xp = gainXP(s, f, wonBoss ? XP_BOSS : XP_ENEMY);
    ({ s, f } = xp);
    events.push(...xp.events);
    if (wonBoss) {
      s = { ...s, stage: s.stage + 1, kills: 0 };
      f = { ...f, boss: false, hp: maxHP(s) };
      events.push({ type: 'bossVictory', stage: s.stage, gold });
    } else {
      s = { ...s, kills: Math.min(KILLS_PER_STAGE, s.kills + 1) };
      f = { ...f, hp: Math.min(maxHP(s), f.hp + HEAL_ON_VICTORY) };
      events.push({ type: 'victory', gold, xp: XP_ENEMY });
    }
    const next = spawn(s, f);
    return { s, f: next.f, events: [...events, ...next.events] };
  }
  f = { ...f, hp: f.hp - retaliation(s, f.boss) };
  if (f.hp <= 0) {
    const next = spawn(s, { ...f, boss: false, hp: maxHP(s) });
    return { s, f: next.f, events: [...events, ...next.events, { type: 'retreat' }] };
  }
  return { s, f, events };
}
