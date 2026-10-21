// Gains d'absence : fonction pure, sans DOM ni horloge globale (`now` est fourni).
// Même formule pour le chargement, un onglet masqué puis revenu et un rechargement.
// Décision : estimation sans défaite — le héros est supposé gagner chaque combat à l'étage courant.
import { attack, maxHP, reward } from './state.js';
import { enemyMaxHP, gainXP, XP_ENEMY } from './combat.js';
import { butinHorsLigne, ajouterObjet } from './equipement.js';
import { OFFLINE_CAP_SECONDS, OFFLINE_PANEL_MIN_SECONDS, OFFLINE_FIGHT_FACTOR } from './balance.js';

export { OFFLINE_CAP_SECONDS, OFFLINE_PANEL_MIN_SECONDS, OFFLINE_FIGHT_FACTOR };

// Renvoie { s, f, events, away, wins, gold, butin, convertis, show } : `butin` liste les objets estimés (ajoutés à l'inventaire, jamais équipés),
// `convertis` ceux que l'inventaire plein a changés en or (déjà compté dans s.gold). `s.last` est toujours ramené à `now` :
// une seconde collecte immédiate donne donc 0, et une horloge reculée ne produit aucun gain.
export function offlineGains(s, now, f = { hp: maxHP(s), boss: false, enemyHP: 0, enemyMax: 0 }, { paused = false } = {}) {
  // En pause, le temps écoulé ne rapporte rien : on ramène seulement `last` à `now`.
  if (paused) return { s: { ...s, last: now }, f, events: [], away: 0, wins: 0, gold: 0, butin: [], convertis: [], show: false };
  const raw = (now - s.last) / 1000;
  const away = Number.isFinite(raw) ? Math.max(0, Math.min(OFFLINE_CAP_SECONDS, raw)) : 0;
  const base = { ...s, last: now };
  if (away <= OFFLINE_PANEL_MIN_SECONDS) return { s: base, f, events: [], away, wins: 0, gold: 0, butin: [], convertis: [], show: false };
  const wins = Math.floor(away / (Math.ceil(enemyMaxHP(s, false) / attack(s)) * OFFLINE_FIGHT_FACTOR));
  const gold = wins * reward(s);
  let r = gainXP({ ...base, gold: base.gold + gold }, f, wins * XP_ENEMY);
  const butin = butinHorsLigne(wins, s.stage), convertis = [];
  for (const objet of butin) {
    const a = ajouterObjet(r.s, objet);
    r = { ...r, s: a.s };
    if (a.converti) convertis.push(a.converti);
  }
  return { ...r, away, wins, gold, butin, convertis, show: true };
}
