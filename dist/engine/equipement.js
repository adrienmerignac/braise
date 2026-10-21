// Équipement : modèle, raretés et tirage du butin. Pur, sans DOM ni horloge ; l'aléa est injecté (`rng` renvoie un réel dans [0, 1)).
// Un objet : { emplacement, rarete, niveau, amelioration (0 à +5), bonus }. `equipe` : { arme?, armure?, charme? } (objets ou absents).
import {
  EQUIPMENT_SLOTS, EQUIPMENT_RARITIES, EQUIPMENT_RARITY_MULT, EQUIPMENT_LEVEL_GROWTH, EQUIPMENT_BASE,
  LOOT_DROP_CHANCE, LOOT_RARITY_WEIGHTS, LOOT_BOSS_RARITY_WEIGHTS, INVENTORY_CAP, LOOT_CONVERSION_GOLD, OFFLINE_LOOT_CAP, EQUIPMENT_UPGRADE_STAT,
  LOOT_ZONE_SLOT_WEIGHTS,
} from './balance.js';
import { idDecor } from './decors.js';

export { EQUIPMENT_SLOTS, EQUIPMENT_RARITIES };

export const BONUS_NULS = Object.freeze({ attaque: 0, vieMax: 0, reductionRiposte: 0, or: 0 });

export function creerObjet(emplacement, rarete, niveau, amelioration = 0) {
  const echelle = EQUIPMENT_RARITY_MULT[rarete] * (1 + EQUIPMENT_LEVEL_GROWTH * (niveau - 1));
  const bonus = {};
  for (const [stat, base] of Object.entries(EQUIPMENT_BASE[emplacement])) bonus[stat] = Math.max(1, Math.floor(base * echelle)) + amelioration * EQUIPMENT_UPGRADE_STAT[stat];
  return { emplacement, rarete, niveau, amelioration, bonus };
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

// Poids d'emplacement de la zone ; zone inconnue → forêt (comme idDecor).
export const poidsEmplacements = zone => LOOT_ZONE_SLOT_WEIGHTS[idDecor(zone)];
export const emplacementDePredilection = zone => {
  const poids = poidsEmplacements(zone);
  return EQUIPMENT_SLOTS.reduce((a, b) => (poids[b] > poids[a] ? b : a));
};

// Butin d'un ennemi vaincu : tableau de 0 ou 1 objet. Ordinaire : chance de drop puis rareté ; gardien : toujours un objet, au moins rare.
// L'emplacement suit les poids de la zone.
export function tirerButin({ ennemi, etape, rng, zone }) {
  const gardien = ennemi === 'gardien' || ennemi?.boss === true;
  if (!gardien && rng() >= LOOT_DROP_CHANCE) return [];
  const rarete = choisirPoids(gardien ? LOOT_BOSS_RARITY_WEIGHTS : LOOT_RARITY_WEIGHTS, rng);
  const emplacement = choisirPoids(poidsEmplacements(zone), rng);
  return [creerObjet(emplacement, rarete, Math.max(1, etape))];
}

export const NOMS_EMPLACEMENT = { arme: 'Arme', armure: 'Armure', charme: 'Charme' };
export const NOMS_RARETE = { commun: 'commun', rare: 'rare', epique: 'épique' };
export const libelleObjet = o => `${NOMS_EMPLACEMENT[o.emplacement]} (${NOMS_RARETE[o.rarete]}, niveau ${o.niveau})`;

// Range un objet dans l'inventaire. Plein : l'objet de moindre rareté (le nouveau à égalité) est converti en or, jamais perdu en silence.
// Renvoie { s, objet, converti } où `converti` vaut null ou { objet, or }.
export function ajouterObjet(s, objet) {
  const inventaire = s.inventaire ?? [];
  if (inventaire.length < INVENTORY_CAP) return { s: { ...s, inventaire: [...inventaire, objet] }, objet, converti: null };
  const rang = o => EQUIPMENT_RARITIES.indexOf(o.rarete);
  let pire = -1;
  inventaire.forEach((o, i) => { if (pire < 0 ? rang(o) < rang(objet) : rang(o) < rang(inventaire[pire])) pire = i; });
  const sorti = pire < 0 ? objet : inventaire[pire];
  const or = LOOT_CONVERSION_GOLD[sorti.rarete];
  const reste = pire < 0 ? inventaire : [...inventaire.slice(0, pire), ...inventaire.slice(pire + 1), objet];
  return { s: { ...s, inventaire: reste, gold: s.gold + or }, objet, converti: { objet: sorti, or } };
}

// Butin estimé d'une absence : déterministe (espérance du tirage), sans épique. Communs et rares dans les proportions des poids,
// emplacements en rotation de 4 (prédilection de la zone, autre 1, prédilection, autre 2), niveau de l'étape courante.
export function butinHorsLigne(victoires, etape, zone) {
  const n = Math.min(OFFLINE_LOOT_CAP, Math.floor(Math.max(0, victoires) * LOOT_DROP_CHANCE));
  const { commun, rare } = LOOT_RARITY_WEIGHTS;
  const nbRares = Math.floor(n * rare / (commun + rare));
  const pref = emplacementDePredilection(zone);
  const [autre1, autre2] = EQUIPMENT_SLOTS.filter(e => e !== pref);
  const rotation = [pref, autre1, pref, autre2];
  return Array.from({ length: n }, (_, i) => creerObjet(rotation[i % rotation.length], i < nbRares ? 'rare' : 'commun', Math.max(1, etape)));
}
