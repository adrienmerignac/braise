// Équipement : modèle, raretés et tirage du butin. Pur, sans DOM ni horloge ; l'aléa est injecté (`rng` renvoie un réel dans [0, 1)).
// Un objet : { emplacement, rarete, niveau, bonus }. `equipe` : { arme?, armure?, charme? } (objets ou absents).
import {
  EQUIPMENT_SLOTS, EQUIPMENT_RARITIES, EQUIPMENT_RARITY_MULT, EQUIPMENT_LEVEL_GROWTH, EQUIPMENT_BASE,
  LOOT_DROP_CHANCE, LOOT_RARITY_WEIGHTS, LOOT_BOSS_RARITY_WEIGHTS,
} from './balance.js';

export { EQUIPMENT_SLOTS, EQUIPMENT_RARITIES };

export const BONUS_NULS = Object.freeze({ attaque: 0, vieMax: 0, reductionRiposte: 0, or: 0 });

export function creerObjet(emplacement, rarete, niveau) {
  const echelle = EQUIPMENT_RARITY_MULT[rarete] * (1 + EQUIPMENT_LEVEL_GROWTH * (niveau - 1));
  const bonus = {};
  for (const [stat, base] of Object.entries(EQUIPMENT_BASE[emplacement])) bonus[stat] = Math.max(1, Math.floor(base * echelle));
  return { emplacement, rarete, niveau, bonus };
}

// Somme des bonus des objets équipés ; sans équipement, tout vaut 0.
export function bonusEquipement(equipe) {
  const total = { ...BONUS_NULS };
  for (const objet of Object.values(equipe ?? {})) {
    if (objet) for (const [stat, v] of Object.entries(objet.bonus)) total[stat] += v;
  }
  return total;
}

function choisirPoids(poids, rng) {
  const entrees = Object.entries(poids);
  let reste = rng() * entrees.reduce((n, [, w]) => n + w, 0);
  for (const [cle, w] of entrees) if ((reste -= w) < 0) return cle;
  return entrees[entrees.length - 1][0];
}

// Butin d'un ennemi vaincu : tableau de 0 ou 1 objet. Ordinaire : chance de drop puis rareté ; gardien : toujours un objet, au moins rare.
export function tirerButin({ ennemi, etape, rng }) {
  const gardien = ennemi === 'gardien' || ennemi?.boss === true;
  if (!gardien && rng() >= LOOT_DROP_CHANCE) return [];
  const rarete = choisirPoids(gardien ? LOOT_BOSS_RARITY_WEIGHTS : LOOT_RARITY_WEIGHTS, rng);
  const emplacement = EQUIPMENT_SLOTS[Math.min(EQUIPMENT_SLOTS.length - 1, Math.floor(rng() * EQUIPMENT_SLOTS.length))];
  return [creerObjet(emplacement, rarete, Math.max(1, etape))];
}
