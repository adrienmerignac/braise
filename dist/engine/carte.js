// Carte (M4.1b) : description pure des lignes du panneau, sans DOM. Les règles d'accès et le voyage vivent dans zones.js.
import { etatZones, etageDArrivee } from './zones.js';
import { etatObjectifs } from './objectifs.js';

export const plageTexte = z => (Number.isFinite(z.fin) ? `Étages ${z.debut} à ${z.fin}` : `Étages ${z.debut} et au-delà`);

// Une ligne par zone, dans l'ordre forêt → ruines → cryptes.
// `objectifs` : lignes de texte des deux objectifs d'une zone ouverte, vide pour une zone fermée.
// `etat` est toujours écrit en toutes lettres ; `icone` le redouble sans le remplacer ; `action` vaut 'voyager' pour une zone ouverte non courante.
// Ligne de texte d'un objectif : l'état est écrit (« ✓ Accompli », « 12/25 », « À accomplir »), jamais porté par un symbole seul.
export const texteObjectif = o => `${o.libelle} — ${o.accompli ? '✓ Accompli' : o.cible > 1 ? `${o.progres}/${o.cible}` : 'À accomplir'} · ${o.or} or`;

export function decrireCarte(s, f) {
  const objectifs = etatObjectifs(s);
  return etatZones(s).map(z => {
    const arrivee = etageDArrivee(s, z.id);
    const etat = z.courante ? 'Vous êtes ici' : z.ouverte ? `Ouverte · étage ${arrivee} en arrivant` : `Fermée · ${z.condition}`;
    const icone = z.courante ? '◆' : z.ouverte ? '○' : '🔒';
    const action = z.ouverte && !z.courante ? 'voyager' : null;
    return { id: z.id, nom: z.nom, plage: plageTexte(z), etat, arrivee, icone, courante: z.courante, ouverte: z.ouverte, action, objectifs: z.ouverte ? objectifs[z.id].map(o => ({ id: o.id, accompli: o.accompli, texte: texteObjectif(o) })) : [], confirmation: action && f?.boss ? 'Le combat contre le gardien sera abandonné.' : null };
  });
}

const VERS = { foret: 'la', ruines: 'les', cryptes: 'les' };
export const messageVoyage = (id, nom, etage) => `Vous voyagez vers ${VERS[id]} ${nom} (étage ${etage}).`;
