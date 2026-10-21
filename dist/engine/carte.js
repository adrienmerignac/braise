// Carte (M4.1b) : description pure des lignes du panneau, sans DOM. Les règles d'accès et le voyage vivent dans zones.js.
import { emplacementDePredilection } from './equipement.js';
import { etatZones, etageDArrivee } from './zones.js';

export const plageTexte = z => (Number.isFinite(z.fin) ? `Étages ${z.debut} à ${z.fin}` : `Étages ${z.debut} et au-delà`);

const BUTIN_TEXTE = { arme: 'armes plus fréquentes', armure: 'armures plus fréquentes', charme: 'charmes plus fréquents' };
export const butinTexte = id => `Butin : ${BUTIN_TEXTE[emplacementDePredilection(id)]}`;

// Une ligne par zone, dans l'ordre forêt → ruines → cryptes.
// `etat` est toujours écrit en toutes lettres ; `icone` le redouble sans le remplacer ; `action` vaut 'voyager' pour une zone ouverte non courante.
export function decrireCarte(s, f) {
  return etatZones(s).map(z => {
    const arrivee = etageDArrivee(s, z.id);
    const etat = z.courante ? 'Vous êtes ici' : z.ouverte ? `Ouverte · étage ${arrivee} en arrivant` : `Fermée · ${z.condition}`;
    const icone = z.courante ? '◆' : z.ouverte ? '○' : '🔒';
    const action = z.ouverte && !z.courante ? 'voyager' : null;
    return { id: z.id, nom: z.nom, plage: plageTexte(z), etat, arrivee, butin: butinTexte(z.id), icone, courante: z.courante, ouverte: z.ouverte, action, confirmation: action && f?.boss ? 'Le combat contre le gardien sera abandonné.' : null };
  });
}

const VERS = { foret: 'la', ruines: 'les', cryptes: 'les' };
export const messageVoyage = (id, nom, etage) => `Vous voyagez vers ${VERS[id]} ${nom} (étage ${etage}).`;
