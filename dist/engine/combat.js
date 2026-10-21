// Récompenses et résolution de combat : fonctions pures, sans DOM ni horloge.
// `s` est l'état persisté (schéma braise-v1) ; `f` l'état de combat, non persisté : { hp, boss, enemyHP, enemyMax }.
// Chaque fonction renvoie { s, f, events } sans modifier ses arguments ; game.js applique les événements.
import { KILLS_PER_STAGE, attack, maxHP, reward, cost, zoneDeEtage } from './state.js';
import {
  XP_PER_LEVEL, XP_ENEMY, XP_BOSS, BOSS_GOLD_MULT, BOSS_HP_MULT, HEAL_ON_VICTORY, HEAL_ON_ARMOR, ENEMY_BASE_HP, ENEMY_HP_PER_STAGE, BESTIAIRE, ENEMY_CATALOG,
  ZONES, RETALIATION_BASE, RETALIATION_BOSS_BASE, RETALIATION_PER_STAGE, RETALIATION_ARMOR_REDUCTION,
} from './balance.js';
import { soinVictoire } from './talents.js';
import { objectifChasse, objectifGardien } from './objectifs.js';
import { bonusEquipement, tirerButin, ajouterObjet } from './equipement.js';

export {
  XP_PER_LEVEL, XP_ENEMY, XP_BOSS, BOSS_GOLD_MULT, BOSS_HP_MULT, HEAL_ON_VICTORY, HEAL_ON_ARMOR, ENEMY_BASE_HP, ENEMY_HP_PER_STAGE,
};

export const xpNeeded = s => s.level * XP_PER_LEVEL;
// Bestiaire de la zone courante (zone inconnue : forêt).
export const bestiaire = s => BESTIAIRE[s.zone] || BESTIAIRE.foret;
// Type de l'ennemi normal courant : fonction pure de l'état persisté, rien de plus à sauvegarder.
export const enemyKind = s => { const types = bestiaire(s).types; return types[(s.stage - 1 + s.kills) % types.length]; };
export const bossName = s => bestiaire(s).gardien;
const kindOf = s => ENEMY_CATALOG[enemyKind(s)];
// Dégâts du héros : le gardien ne porte aucun modificateur ; un ennemi ordinaire module l'attaque auto (`coups`) ou la frappe de braise (`braise`).
export function heroDamage(s, boss, mult = 1) {
  const base = attack(s) * mult;
  if (boss) return base;
  const m = (mult > 1 ? kindOf(s).braise : kindOf(s).coups) ?? 1;
  return m === 1 ? base : Math.max(1, Math.floor(base * m));
}
// Modificateur en clair pour l'affichage ; vide si l'ennemi n'en a pas.
export function modificateurTexte(s) {
  const k = kindOf(s), parts = [];
  if (k.coups !== undefined) parts.push(k.coups < 1 ? 'résiste aux coups' : 'fragile aux coups');
  if (k.braise !== undefined) parts.push(k.braise < 1 ? 'résiste à la braise' : 'vulnérable à la braise');
  const texte = parts.join(' · ');
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}
export const enemyMaxHP = (s, boss) => Math.floor((ENEMY_BASE_HP + s.stage * ENEMY_HP_PER_STAGE) * (boss ? BOSS_HP_MULT : kindOf(s).hp));
export const retaliation = (s, boss) => Math.max(1, Math.floor(((boss ? RETALIATION_BOSS_BASE : RETALIATION_BASE) + s.stage * RETALIATION_PER_STAGE) * (boss ? 1 : kindOf(s).retaliation) - s.armor * RETALIATION_ARMOR_REDUCTION - bonusEquipement(s.equipe).reductionRiposte));
export const victoryGold = (s, boss) => Math.floor(reward(s) * (boss ? BOSS_GOLD_MULT : kindOf(s).gold));

// Évaluation du danger, sans compter la compétence : coups pour vaincre l'ennemi vs coups que le héros encaisse.
export function assess(s, f) {
  const attackPerHit = heroDamage(s, f.boss);
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
  const enemyMax = enemyMaxHP(s, saved.boss);
  return { hp, boss: saved.boss, enemyHP: Math.min(saved.enemyHP, enemyMax), enemyMax };
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
  const damage = heroDamage(s, f.boss, mult);
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
      events.push({ type: 'bossVictory', stage: s.stage, gold, xp: XP_BOSS, healed, ...(zoneOuverte && { zoneOuverte }), ...(s.stage === etageVaincu && { plafond: true }) });
      s = objectifGardien(s, etageVaincu, events);
    } else {
      s = { ...s, kills: Math.min(KILLS_PER_STAGE, s.kills + 1) };
      const healed = Math.min(maxHP(s), f.hp + soinVictoire(s)) - f.hp;
      f = { ...f, hp: f.hp + healed };
      events.push({ type: 'victory', gold, xp: XP_ENEMY, healed });
      s = objectifChasse(s, events);
    }
    if (rng) {
      for (const objet of tirerButin({ ennemi: wonBoss ? 'gardien' : 'ordinaire', etape: etageVaincu, rng, zone: s.zone })) {
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
