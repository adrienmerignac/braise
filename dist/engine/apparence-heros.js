// Couches LPC du héros selon l'équipement : pur, sans DOM. Même ordre que tools/compose-hero.py.
// Le charme n'a pas de couche LPC : il ne change rien à l'apparence.
export const ACTIONS_HEROS = Object.freeze(['walk', 'swing', 'hurt']);
const COUCHES_BASE = Object.freeze(['body', 'pants', 'boots', 'mail']);

// `equipe` : { arme?, armure?, charme? } (objets) ou { arme, armure } (booléens de braise:equipement) ; absent = rien d'équipé.
export function resumeEquipement(equipe) {
  return { arme: Boolean(equipe?.arme), armure: Boolean(equipe?.armure) };
}

// Noms de fichiers (sans extension) à superposer, du dessous au dessus.
export function couchesHeros(equipe, action) {
  const { arme, armure } = resumeEquipement(equipe);
  const couches = [...COUCHES_BASE];
  if (armure) couches.push('plate');
  couches.push('hood');
  const noms = couches.map(c => `${c}-${action}`);
  if (arme && action === 'swing') noms.push('sword');
  return noms;
}
