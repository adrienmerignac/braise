import { libelleObjet } from './equipement.js';
import { ZONES, OBJECTIFS } from './balance.js';

export const SAUVEGARDE_FUTURE = 'Cette sauvegarde vient d’une version plus récente de Braise. Recharge la page pour retrouver ta partie ; rien n’a été modifié.';
export const IMPORT_FUTURE = 'Import refusé : ce fichier vient d’une version plus récente de Braise. La partie en cours est inchangée.';

// Texte d'un gardien vaincu : zone ouverte, étage atteint, ou héros retenu au dernier étage de sa zone. Pur.
export function texteGardienVaincu(e) {
  if (e.zoneOuverte) return `Gardien vaincu ! Les ${ZONES[e.zoneOuverte].nom} s’ouvrent : ouvrez la carte pour y voyager.`;
  if (e.plafond) return 'Gardien vaincu ! Fin de la zone : la suite se rejoint par la carte.';
  return `Gardien vaincu ! L’étage ${e.stage} s’ouvre.`;
}

// Ce qui a été fait, au passé, pour l'annonce d'un objectif de zone accompli.
export const faitObjectif = (zone, id) => (id === 'chasse' ? `${OBJECTIFS[zone].chasse.cible} ennemis vaincus` : `gardien de l’étage ${OBJECTIFS[zone].gardien.cible} vaincu`);

// Décide ce qui est annoncé aux lecteurs d'écran (région #alert) : seulement les événements rares. Pur, sans DOM.
// Un coup ordinaire, une victoire ordinaire, une recharge ou une mise à jour de barre ne sont jamais annoncés.
export function annoncePour(e) {
  switch (e && e.type) {
    case 'retreat':
      return `Repli : ${e.boss ? 'le gardien' : 'l’ennemi'} frappait pour ${e.taken}, il lui restait ${Math.max(0, Math.ceil(e.enemyHP))} PV. Butin conservé.`;
    case 'bossVictory':
      return texteGardienVaincu(e);
    case 'levelup':
      return `Niveau ${e.level} atteint.`;
    case 'butin':
      return `Objet trouvé : ${libelleObjet(e.objet)}.${e.converti ? ` Inventaire plein : ${libelleObjet(e.converti.objet)} converti en ${e.converti.or} or.` : ''}`;
    case 'objectif':
      return `Objectif accompli : ${ZONES[e.zone].nom} — ${faitObjectif(e.zone, e.id)}, +${e.or} or.`;
    case 'achatImpossible':
      return 'Achat impossible : pas assez d’or.';
    case 'sauvegardeFuture':
      return SAUVEGARDE_FUTURE;
    default:
      return null;
  }
}

// Rassemble les annonces d'un même run() en une seule phrase : une seule mise à jour de #alert par frame,
// sinon la dernière écraserait les précédentes (gardien vaincu puis niveau gagné).
export function annoncesPour(events) {
  return (events || []).map(annoncePour).filter(Boolean).join(' ') || null;
}
