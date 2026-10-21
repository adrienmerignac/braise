// Zones : accès, condition affichable et voyage. Fonctions pures, sans DOM ni horloge.
import { ZONE_IDS, ZONES } from './balance.js';
import { newFight } from './combat.js';
import { zoneDeEtage } from './state.js';

export { ZONE_IDS, ZONES, zoneDeEtage };

export const zoneOuverte = (s, id) => s.meilleurEtage >= ZONES[id].debut;
export const conditionZone = id => (ZONES[id].debut <= 1 ? 'Toujours ouverte' : `Vaincre le gardien de l’étage ${ZONES[id].debut - 1}`);

// Liste ordonnée pour l'interface : { id, nom, debut, fin, ouverte, courante, condition }.
export const etatZones = s => ZONE_IDS.map(id => ({ id, ...ZONES[id], ouverte: zoneOuverte(s, id), courante: s.zone === id, condition: conditionZone(id) }));

// Étage d'arrivée : le plus haut atteint dans la plage de la zone, au moins son premier étage.
export const etageDArrivee = (s, id) => Math.max(ZONES[id].debut, Math.min(s.meilleurEtage, ZONES[id].fin));

// Renvoie { s, f, events, ok, motif }. Zone fermée, inconnue ou déjà courante : état inchangé. Le gardien en cours est abandonné sans pénalité, la vie conservée.
export function voyager(s, f, zoneId) {
  if (!ZONE_IDS.includes(zoneId)) return { s, f, events: [], ok: false, motif: 'inconnue' };
  if (zoneId === s.zone) return { s, f, events: [], ok: false, motif: 'courante' };
  if (!zoneOuverte(s, zoneId)) return { s, f, events: [], ok: false, motif: 'fermee' };
  const apres = { ...s, zone: zoneId, stage: etageDArrivee(s, zoneId), kills: 0 };
  const next = newFight(apres);
  return { s: next.s, f: { ...next.f, hp: f.hp }, events: [...next.events, { type: 'voyage', zone: zoneId, stage: apres.stage }], ok: true };
}
