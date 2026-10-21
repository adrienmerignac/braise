// Gains d'absence : fonction pure, sans DOM ni horloge globale (`now` est fourni).
// Même formule pour le chargement, un onglet masqué puis revenu et un rechargement.
// Décision : estimation sans défaite — le héros est supposé gagner chaque combat à l'étage courant.
import { attack, maxHP, reward } from './state.js';
import { enemyMaxHP, gainXP, XP_ENEMY } from './combat.js';

export const OFFLINE_CAP_SECONDS = 28800;
export const OFFLINE_PANEL_MIN_SECONDS = 60;
export const OFFLINE_FIGHT_FACTOR = 1.2;

// Renvoie { s, f, events, away, wins, gold, show }. `s.last` est toujours ramené à `now` :
// une seconde collecte immédiate donne donc 0, et une horloge reculée ne produit aucun gain.
export function offlineGains(s, now, f = { hp: maxHP(s), boss: false, enemyHP: 0, enemyMax: 0 }) {
  const raw = (now - s.last) / 1000;
  const away = Number.isFinite(raw) ? Math.max(0, Math.min(OFFLINE_CAP_SECONDS, raw)) : 0;
  const base = { ...s, last: now };
  if (away <= OFFLINE_PANEL_MIN_SECONDS) return { s: base, f, events: [], away, wins: 0, gold: 0, show: false };
  const wins = Math.floor(away / (Math.ceil(enemyMaxHP(s, false) / attack(s)) * OFFLINE_FIGHT_FACTOR));
  const gold = wins * reward(s);
  const r = gainXP({ ...base, gold: base.gold + gold }, f, wins * XP_ENEMY);
  return { ...r, away, wins, gold, show: true };
}
