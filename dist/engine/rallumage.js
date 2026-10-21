// Rallumage de la braise (M5.2a) : fonctions pures, sans DOM ni horloge. Remet la partie à zéro contre des éclats permanents.
// `s.rallumage` = { eclats, nombre, record }. L'aperçu et `rallumer` partagent les mêmes calculs : l'un ne peut pas mentir sur l'autre.
import { RALLUMAGE_DEBLOCAGE, RALLUMAGE_PAS, RALLUMAGE_DECALAGE, RALLUMAGE_BONUS, RALLUMAGE_ECLATS_MAX } from './balance.js';
import { fresh } from './state.js';
import { newFight } from './combat.js';

export const rallumageDisponible = s => s.meilleurEtage > RALLUMAGE_DEBLOCAGE;
export const eclatsGagnes = s => Math.max(0, Math.floor(s.meilleurEtage / RALLUMAGE_PAS) - RALLUMAGE_DECALAGE);
const eclatsActuels = s => s.rallumage?.eclats ?? 0;
const eclatsApres = s => Math.min(RALLUMAGE_ECLATS_MAX, eclatsActuels(s) + eclatsGagnes(s));
const nf = n => n.toLocaleString('fr-FR');
const pluriel = (n, un, plusieurs) => `${nf(n)} ${n > 1 ? plusieurs : un}`;

// Ce que `rallumer` fera, en libellés français pour l'interface.
export function apercuRallumage(s) {
  const objets = (s.inventaire ?? []).length, equipes = Object.keys(s.equipe ?? {}).length;
  const avant = eclatsActuels(s), apres = eclatsApres(s);
  return {
    disponible: rallumageDisponible(s),
    eclatsGagnes: apres - avant,
    eclatsApres: apres,
    bonusAvant: avant * RALLUMAGE_BONUS,
    bonusApres: apres * RALLUMAGE_BONUS,
    remisAZero: [
      `${nf(s.gold)} or`, `Niveau ${nf(s.level)}`, `${nf(s.xp)} d’expérience`, 'Talents (points rendus au niveau 1)',
      `Étage ${nf(s.stage)}, retour à l’étage 1 de la Forêt des Murmures`, 'Armes, armures et charmes améliorés',
      `${pluriel(objets, 'objet', 'objets')} de l’inventaire et ${pluriel(equipes, 'objet équipé', 'objets équipés')}`,
    ],
    conserve: [
      `${pluriel(apres, 'éclat de braise', 'éclats de braise')}`, `${pluriel(s.rallumage?.nombre ?? 0, 'rallumage effectué', 'rallumages effectués')}`,
      `Record : étage ${nf(Math.max(s.meilleurEtage, s.rallumage?.record ?? 0))}`, 'Objectifs de zone accomplis', 'Récits lus', 'Bestiaire', 'Succès',
      'Réglages et automatismes',
    ],
  };
}

// `confirme` doit être vrai, sinon refus 'confirmation' ; avant le gardien de l'étage RALLUMAGE_DEBLOCAGE, refus 'indisponible'.
// Aucun changement en cas de refus. Renvoie aussi `f`, le combat neuf à installer (l'ennemi en cours est remis à zéro).
export function rallumer(s, now, { confirme = false } = {}) {
  if (!rallumageDisponible(s)) return { s, ok: false, motif: 'indisponible' };
  if (!confirme) return { s, ok: false, motif: 'confirmation' };
  const base = fresh(now);
  const rallumage = { eclats: eclatsApres(s), nombre: (s.rallumage?.nombre ?? 0) + 1, record: Math.max(s.meilleurEtage, s.rallumage?.record ?? 0) };
  const neuf = { ...base, rallumage, objectifs: s.objectifs, recitsLus: s.recitsLus, bestiaire: s.bestiaire, succes: s.succes, automatismes: s.automatismes };
  return { s: neuf, f: newFight(neuf).f, ok: true, eclats: rallumage.eclats - eclatsActuels(s) };
}
