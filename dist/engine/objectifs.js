// Objectifs de zone : fonctions pures, sans DOM ni horloge. `s.objectifs[zone] = { chasse, faits }`.
import { ZONE_IDS, OBJECTIFS } from './balance.js';

export const objectifsNeufs = () => Object.fromEntries(ZONE_IDS.map(z => [z, { chasse: 0, faits: [] }]));

// Gardien de l'étage cible déjà dépassé par le meilleur étage (même règle pour la migration et le jeu).
export const gardienDepasse = (zone, meilleurEtage) => meilleurEtage > OBJECTIFS[zone].gardien.cible;

const accomplir = (s, zone, id, events) => {
  const o = s.objectifs[zone], or = OBJECTIFS[zone][id].or;
  events.push({ type: 'objectif', zone, id, or });
  return { ...s, gold: s.gold + or, objectifs: { ...s.objectifs, [zone]: { ...o, faits: [...o.faits, id] } } };
};

// Ennemi ordinaire vaincu en ligne dans la zone courante : le compteur se borne à la cible.
export function objectifChasse(s, events) {
  const zone = s.zone, o = s.objectifs[zone], { cible } = OBJECTIFS[zone].chasse;
  if (o.faits.includes('chasse')) return s;
  s = { ...s, objectifs: { ...s.objectifs, [zone]: { ...o, chasse: Math.min(cible, o.chasse + 1) } } };
  return s.objectifs[zone].chasse >= cible ? accomplir(s, zone, 'chasse', events) : s;
}

// Gardien de l'étage `etage` vaincu dans la zone courante.
export function objectifGardien(s, etage, events) {
  const zone = s.zone;
  if (s.objectifs[zone].faits.includes('gardien') || etage !== OBJECTIFS[zone].gardien.cible) return s;
  return accomplir(s, zone, 'gardien', events);
}

// Lecture pour l'interface : par zone, [{ id, libelle, progres, cible, accompli, or }].
export function etatObjectifs(s) {
  return Object.fromEntries(ZONE_IDS.map(zone => {
    const o = s.objectifs[zone], d = OBJECTIFS[zone];
    // Gardien : tout ou rien (progrès 0/1) ; l'étage visé est dans le libellé.
    const ligne = (id, libelle, progres, cible) => {
      const accompli = o.faits.includes(id);
      return { id, libelle, progres: accompli ? cible : progres, cible, accompli, or: d[id].or };
    };
    return [zone, [
      ligne('chasse', `Vaincre ${d.chasse.cible} ennemis de la zone`, o.chasse, d.chasse.cible),
      ligne('gardien', `Vaincre le gardien de l’étage ${d.gardien.cible}`, 0, 1),
    ]];
  }));
}
