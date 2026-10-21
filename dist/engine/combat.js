// Récompenses et résolution de combat : fonctions pures, sans DOM ni horloge.
// `s` est l'état persisté (schéma braise-v1) ; `f` l'état de combat, non persisté : { hp, boss, enemyHP, enemyMax }.
// Chaque fonction renvoie { s, f, events } sans modifier ses arguments ; game.js applique les événements.
import { KILLS_PER_STAGE, attack, maxHP, reward, cost, zoneDeEtage } from './state.js';
import {
  XP_PER_LEVEL, XP_ENEMY, XP_BOSS, BOSS_GOLD_MULT, BOSS_HP_MULT, HEAL_ON_VICTORY, HEAL_ON_ARMOR, ENEMY_BASE_HP, ENEMY_HP_PER_STAGE, ENEMY_KINDS, ENEMY_CATALOG,
  ZONES, RETALIATION_BASE, RETALIATION_BOSS_BASE, RETALIATION_PER_STAGE, RETALIATION_ARMOR_REDUCTION,
} from './balance.js';
import { soinVictoire } from './talents.js';
import { bonusEquipement, tirerButin, ajouterObjet } from './equipement.js';

export {
  XP_PER_LEVEL, XP_ENEMY, XP_BOSS, BOSS_GOLD_MULT, BOSS_HP_MULT, HEAL_ON_VICTORY, HEAL_ON_ARMOR, ENEMY_BASE_HP, ENEMY_HP_PER_STAGE,
};

export const xpNeeded = s => s.level * XP_PER_LEVEL;
// Type de l'ennemi normal courant : fonction pure de l'état persisté, rien de plus à sauvegarder.
export const enemyKind = s => ENEMY_KINDS[(s.stage - 1 + s.kills) % ENEMY_KINDS.length];
const kindOf = s => ENEMY_CATALOG[enemyKind(s)];
export const enemyMaxHP = (s, boss) => Math.floor((ENEMY_BASE_HP + s.stage * ENEMY_HP_PER_STAGE) * (boss ? BOSS_HP_MULT : kindOf(s).hp));
export const retaliation = (s, boss) => Math.max(1, Math.floor(((boss ? RETALIATION_BOSS_BASE : RETALIATION_BASE) + s.stage * RETALIATION_PER_STAGE) * (boss ? 1 : kindOf(s).retaliation) - s.armor * RETALIATION_ARMOR_REDUCTION - bonusEquipement(s.equipe).reductionRiposte));
export const victoryGold = (s, boss) => Math.floor(reward(s) * (boss ? BOSS_GOLD_MULT : kindOf(s).gold));

// Évaluation du danger, sans compter la compétence : coups pour vaincre l'ennemi vs coups que le héros encaisse.
export function assess(s, f) {
  const attackPerHit = attack(s);
  const hitsToWin = Math.max(1, Math.ceil(f.enemyHP / attackPerHit));
  const hitsToSurvive = Math.max(0, Math.ceil(f.hp / retaliation(s, f.boss)));
  const danger = hitsToSurvive < hitsToWin ? 'Mortel' : hitsToSurvive < 2 * hitsToWin ? 'Serré' : 'Sûr';
  const hitsAbsorbed = Math.max(0, hitsToSurvive - 1); // la riposte qui met le héros à terre n’est pas encaissée
  return { attack: attackPerHit, hitsToWin, hitsToSurvive, hitsAbsorbed, danger };
}

// Danger du gardien à venir : il apparaît à vitalité pleine du héros et à PV pleins.
export const assessGuardian = s => assess(s, { boss: true, hp: maxHP(s), enemyHP: enemyMaxHP(s, true) });

export function gainXP(s, f, n) {
  s = { ...s, xp: s.xp + n };
  const events = [];
  while (s.xp >= xpNeeded(s)) {
    s.xp -= xpNeeded(s);
    s.level++;
    const healed = Math.max(0, maxHP(s) - f.hp);
    f = { ...f, hp: maxHP(s) };
    events.push({ type: 'levelup', level: s.level, healed });
  }
  return { s, f, events };
}

export function spawn(s, f, boss = f.boss) {
  const enemyMax = enemyMaxHP(s, boss);
  return { s, f: { ...f, boss, enemyHP: enemyMax, enemyMax }, events: [{ type: 'spawn', boss, kind: boss ? null : enemyKind(s) }] };
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
  return { s, f, events: [{ type: 'upgrade', kind, level: s[kind], ...(kind === 'armor' && { healed: HEAL_ON_ARMOR }) }] };
}

// `rng` (réel dans [0, 1)) est injecté par game.js ; sans lui, aucun butin n'est tiré.
export function strike(s, f, mult = 1, rng = null) {
  const damage = attack(s) * mult;
  const enemyHP = f.enemyHP - damage;
  const defeated = enemyHP <= 0;
  const taken = defeated ? 0 : retaliation(s, f.boss);
  const events = [{ type: 'combat', damage, strong: mult > 1, defeated, boss: f.boss, kind: f.boss ? null : enemyKind(s), health: f.hp / maxHP(s), taken }];
  f = { ...f, enemyHP };
  if (defeated) {
    const wonBoss = f.boss, etageVaincu = s.stage;
    const gold = victoryGold(s, wonBoss);
    s = { ...s, gold: s.gold + gold };
    const xp = gainXP(s, f, wonBoss ? XP_BOSS : XP_ENEMY);
    ({ s, f } = xp);
    events.push(...xp.events);
    if (wonBoss) {
      const ancienne = zoneDeEtage(s.meilleurEtage), meilleurEtage = Math.max(s.meilleurEtage, etageVaincu + 1);
      // Le plafond de la zone retient le héros : l'étage ne monte que si la zone continue.
      s = { ...s, stage: Math.min(etageVaincu + 1, ZONES[s.zone].fin), kills: 0, meilleurEtage };
      const zoneOuverte = zoneDeEtage(meilleurEtage) !== ancienne ? zoneDeEtage(meilleurEtage) : undefined;
      const healed = Math.max(0, maxHP(s) - f.hp);
      f = { ...f, boss: false, hp: maxHP(s) };
      events.push({ type: 'bossVictory', stage: s.stage, gold, xp: XP_BOSS, healed, ...(zoneOuverte && { zoneOuverte }) });
    } else {
      s = { ...s, kills: Math.min(KILLS_PER_STAGE, s.kills + 1) };
      const healed = Math.min(maxHP(s), f.hp + soinVictoire(s)) - f.hp;
      f = { ...f, hp: f.hp + healed };
      events.push({ type: 'victory', gold, xp: XP_ENEMY, healed });
    }
    if (rng) {
      for (const objet of tirerButin({ ennemi: wonBoss ? 'gardien' : 'ordinaire', etape: etageVaincu, rng })) {
        const r = ajouterObjet(s, objet);
        s = r.s;
        events.push({ type: 'butin', objet, converti: r.converti });
      }
    }
    const next = spawn(s, f);
    return { s, f: next.f, events: [...events, ...next.events] };
  }
  f = { ...f, hp: f.hp - taken };
  if (f.hp <= 0) {
    const retreat = { type: 'retreat', boss: f.boss, taken, enemyHP: f.enemyHP };
    const next = spawn(s, { ...f, boss: false, hp: maxHP(s) });
    return { s, f: next.f, events: [...events, ...next.events, retreat] };
  }
  return { s, f, events };
}
