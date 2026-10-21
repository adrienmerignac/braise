// Collection du bestiaire (M5.3) : fonctions pures, sans DOM. Informative : aucun effet sur la puissance ni l'équilibrage.
// Entrées : les types de `ENEMY_CATALOG` (clé du type) et un gardien par zone (`gardien:<zone>`) ; chacune porte `vus` et `victoires`.
// L'absence ne crédite jamais la collection : seules les apparitions et victoires en session passent ici.
import { ENEMY_CATALOG, BESTIAIRE, ZONE_IDS, ZONES } from './balance.js';
import { modificateurDe } from './combat.js';

export const GARDIEN_PREFIXE = 'gardien:';
export const cleGardien = zone => GARDIEN_PREFIXE + zone;
export const BESTIAIRE_IDS = [...Object.keys(ENEMY_CATALOG), ...ZONE_IDS.map(cleGardien)];
export const MAX_VICTOIRES = Number.MAX_SAFE_INTEGER;

export const bestiaireNeuf = () => Object.fromEntries(BESTIAIRE_IDS.map(id => [id, { vus: false, victoires: 0 }]));

// Clé de l'ennemi : le gardien de la zone ou le type courant.
export const cleEnnemi = (boss, zone, kind) => (boss ? cleGardien(zone) : kind);

export function marquerVu(s, cle) {
  const e = s.bestiaire[cle];
  if (!e || e.vus) return s;
  return { ...s, bestiaire: { ...s.bestiaire, [cle]: { ...e, vus: true } } };
}

// Une victoire marque aussi l'entrée comme vue ; le compteur reste borné.
export function enregistrerVictoire(s, cle) {
  const e = s.bestiaire[cle];
  if (!e) return s;
  return { ...s, bestiaire: { ...s.bestiaire, [cle]: { vus: true, victoires: Math.min(MAX_VICTOIRES, e.victoires + 1) } } };
}

// Migration v7 → v8 : types des zones atteintes vus ; gardien vu une fois battu (`meilleurEtage` au-delà de la fin de zone).
export function bestiaireMigre(meilleurEtage) {
  const b = bestiaireNeuf();
  if (!Number.isInteger(meilleurEtage)) return b;
  for (const z of ZONE_IDS) {
    if (ZONES[z].debut <= meilleurEtage) for (const t of BESTIAIRE[z].types) b[t].vus = true;
    if (meilleurEtage > ZONES[z].fin) b[cleGardien(z)].vus = true;
  }
  return b;
}

// Lecture tolérante : clés inconnues ignorées, valeurs invalides ramenées au défaut. `repaired` si quoi que ce soit a été corrigé.
// Champ absent ou non objet : collection vierge, sans perte du reste de la partie.
export function lireBestiaire(brut) {
  const b = bestiaireNeuf(), defaut = bestiaireNeuf();
  if (brut === undefined) return { bestiaire: defaut, repaired: false };
  if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) return { bestiaire: defaut, repaired: true };
  let repaired = false;
  for (const id of BESTIAIRE_IDS) {
    const e = brut[id];
    if (e === undefined) continue;
    if (e === null || typeof e !== 'object' || Array.isArray(e)) { repaired = true; continue; }
    const v = e.victoires;
    const victoires = typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(MAX_VICTOIRES, Math.floor(v)) : 0;
    if (victoires !== v || typeof e.vus !== 'boolean') repaired = true;
    b[id] = { vus: e.vus === true || victoires > 0, victoires };
  }
  return { bestiaire: b, repaired };
}

// Libellés du panneau Carte, groupés par zone. Une entrée jamais vue ne révèle ni son nom ni son modificateur.
const victoiresTexte = n => (n === 0 ? 'Aucune victoire' : `${n.toLocaleString('fr-FR')} ${n === 1 ? 'victoire' : 'victoires'}`);
export function decrireBestiaire(s) {
  return ZONE_IDS.map(zone => {
    const entree = (cle, nom, gardien) => {
      const e = s.bestiaire[cle];
      if (!e.vus) return { cle, vu: false, gardien, nom: '???', modificateur: '', victoires: '', detail: 'Pas encore rencontré' };
      return { cle, vu: true, gardien, nom, modificateur: gardien ? '' : modificateurDe(cle), victoires: victoiresTexte(e.victoires), detail: '' };
    };
    const entrees = [
      ...BESTIAIRE[zone].types.map(t => entree(t, ENEMY_CATALOG[t].name, false)),
      entree(cleGardien(zone), BESTIAIRE[zone].gardien, true),
    ];
    return { zone, nom: ZONES[zone].nom, compteur: `${entrees.filter(x => x.vu).length}/${entrees.length} rencontrés`, entrees };
  });
}
