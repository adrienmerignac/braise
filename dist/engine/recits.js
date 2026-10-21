// Récits du fil de la braise : fonctions pures, sans DOM ni horloge. Le déblocage se déduit de `meilleurEtage` ;
// seule la lecture est persistée (`s.recitsLus`). L'absence n'avance jamais `meilleurEtage`, donc ne débloque rien.
export const RECITS = [
  { id: 'braise', etage: 1, titre: 'La braise du camp', texte: 'Au camp de la Forêt des Murmures, une braise refuse de s’éteindre. Tu la veilles chaque nuit, et chaque nuit elle te répond d’une lueur. Tant qu’elle vit, tu avances.' },
  { id: 'ruines', etage: 6, titre: 'Une route sous les eaux', texte: 'Quand le Gardien de braise est tombé, la braise a vacillé puis s’est mise à luire en direction du sud. Elle éclaire la route des Ruines englouties. Il faut la suivre.' },
  { id: 'cryptes', etage: 11, titre: 'Le passage gardé', texte: 'La Sentinelle engloutie gardait un passage que personne n’avait franchi depuis longtemps. La braise s’en détourne et pointe plus bas, vers les Cryptes de cendre.' },
  { id: 'cendres', etage: 16, titre: 'Plus forte qu’avant', texte: 'Le Gardien des cendres n’est plus. De retour au camp, tu vois la braise brûler plus fort qu’avant. Elle ne dit pas ce qu’elle attend, mais elle attend.' },
];
export const RECIT_IDS = RECITS.map(r => r.id);

export const recitDebloque = (r, meilleurEtage) => meilleurEtage >= r.etage;
// Valeur par défaut d'une partie reprise : récits déjà débloqués par un meilleur étage, considérés comme lus.
// Une partie sans progrès (étage 1) n'a rien lu : le récit de départ lui reste à découvrir.
export const recitsDebloques = meilleurEtage => (meilleurEtage > 1 ? RECITS.filter(r => recitDebloque(r, meilleurEtage)).map(r => r.id) : []);

// Récit que la victoire du gardien vient de débloquer (meilleur étage passé de `avant` à `s.meilleurEtage`) et pas encore lu :
// signalé une seule fois, jamais pour un identifiant déjà lu. Le récit de départ n'a pas de gardien : l'interface l'affiche.
export function recitsNouveaux(s, avant, events) {
  for (const r of RECITS) if (!recitDebloque(r, avant) && recitDebloque(r, s.meilleurEtage) && !s.recitsLus.includes(r.id)) events.push({ type: 'recit', id: r.id });
  return s;
}

export function marquerRecitLu(s, id) {
  if (!RECIT_IDS.includes(id) || s.recitsLus.includes(id)) return s;
  return { ...s, recitsLus: RECIT_IDS.filter(k => k === id || s.recitsLus.includes(k)) };
}

export const etatRecits = s => RECITS.map(r => ({ id: r.id, titre: r.titre, texte: r.texte, debloque: recitDebloque(r, s.meilleurEtage), lu: s.recitsLus.includes(r.id) }));
