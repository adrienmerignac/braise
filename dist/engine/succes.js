// Succès (M5.3) : fonctions pures, sans DOM ni horloge. `s.succes` = identifiants obtenus, une seule fois chacun.
// Informatifs : aucun or, aucun bonus, aucun effet sur l'équilibrage. Aucune condition liée au calendrier.
// Évalués en session seulement : l'absence n'appelle jamais `verifierSucces` (aucune condition ne dépend de l'or, de l'expérience ni du niveau).
import { ZONE_IDS } from './balance.js';
import { BESTIAIRE_IDS } from './bestiaire.js';
import { RECIT_IDS } from './recits.js';
import { TALENT_IDS, rang } from './talents.js';

const faits = s => ZONE_IDS.reduce((n, z) => n + (s.objectifs?.[z]?.faits?.length || 0), 0);
const victoires = s => BESTIAIRE_IDS.reduce((n, id) => n + (s.bestiaire?.[id]?.victoires || 0), 0);
const vus = s => BESTIAIRE_IDS.filter(id => s.bestiaire?.[id]?.vus).length;
const recits = s => RECIT_IDS.filter(id => s.recitsLus?.includes(id)).length;
// Rangs lus tolérants : la migration évalue l'état avant sa validation (un rang non entier ne compte pas).
const talents = s => TALENT_IDS.reduce((n, id) => n + (Number.isInteger(rang(s, id)) && rang(s, id) > 0 ? rang(s, id) : 0), 0);
const epique = s => Object.values(s.equipe || {}).some(o => o && o.rarete === 'epique') ? 1 : 0;

// Valeurs de départ, réversibles. `progres(s)` est borné à `cible` par `etatSucces`.
export const SUCCES = [
  { id: 'etage25', libelle: 'Atteindre l’étage 25', cible: 25, progres: s => s.meilleurEtage },
  { id: 'etage50', libelle: 'Atteindre l’étage 50', cible: 50, progres: s => s.meilleurEtage },
  { id: 'etage100', libelle: 'Atteindre l’étage 100', cible: 100, progres: s => s.meilleurEtage },
  { id: 'bestiaire', libelle: `Rencontrer les ${BESTIAIRE_IDS.length} entrées du bestiaire`, cible: BESTIAIRE_IDS.length, progres: vus },
  { id: 'chasseur', libelle: 'Remporter 500 victoires', cible: 500, progres: victoires },
  { id: 'objectifs', libelle: `Accomplir les ${ZONE_IDS.length * 2} objectifs de zone`, cible: ZONE_IDS.length * 2, progres: faits },
  { id: 'recits', libelle: `Lire les ${RECIT_IDS.length} récits`, cible: RECIT_IDS.length, progres: recits },
  { id: 'epique', libelle: 'Équiper un objet épique', cible: 1, progres: epique },
  { id: 'talents', libelle: 'Investir 5 points de talent', cible: 5, progres: talents },
];
export const SUCCES_IDS = SUCCES.map(d => d.id);

export const succesNeufs = () => [];

const rempli = (s, d) => d.progres(s) >= d.cible;

// Succès remplis par l'état, dans l'ordre de la table (migration et valeur par défaut d'une lecture réparée).
export const succesRemplis = s => SUCCES.filter(d => rempli(s, d)).map(d => d.id);

// Ajoute chaque succès nouvellement rempli et pousse un événement `succes` par succès, une seule fois.
export function verifierSucces(s, events) {
  const acquis = s.succes || [];
  const neufs = SUCCES.filter(d => !acquis.includes(d.id) && rempli(s, d));
  if (!neufs.length) return s;
  for (const d of neufs) events.push({ type: 'succes', id: d.id, libelle: d.libelle });
  return { ...s, succes: SUCCES_IDS.filter(id => acquis.includes(id) || neufs.some(d => d.id === id)) };
}

// Lecture pour l'interface : [{ id, libelle, obtenu, progres, cible }].
export const etatSucces = s => SUCCES.map(d => {
  const obtenu = (s.succes || []).includes(d.id);
  return { id: d.id, libelle: d.libelle, obtenu, progres: obtenu ? d.cible : Math.min(d.cible, Math.max(0, d.progres(s))), cible: d.cible };
});

// Lecture tolérante : identifiants inconnus ignorés, doublons retirés ; non-tableau : liste déduite de l'état, `repaired`.
export function lireSucces(brut, s) {
  if (Array.isArray(brut)) return { succes: SUCCES_IDS.filter(id => brut.includes(id)), repaired: brut.length !== new Set(brut).size || brut.some(id => !SUCCES_IDS.includes(id)) };
  return { succes: succesRemplis(s), repaired: brut !== undefined };
}
