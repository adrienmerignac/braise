// Étincelles de la scène et décision de redessiner : pures, sans DOM.
export const ETINCELLES_MAX = 60; // plafond d'étincelles en vol ; au-delà, les plus anciennes partent

// Ajoute `nouvelles` à la fin de `liste` (modifiée en place) puis retire les plus anciennes au-delà du plafond.
export function ajouterEtincelles(liste, nouvelles, max = ETINCELLES_MAX) {
  liste.push(...nouvelles);
  if (liste.length > max) liste.splice(0, liste.length - max);
  return liste;
}

// En pause, une dernière image suffit : on ne redessine ensuite que sur événement reçu (combat, spawn, réglage) ou à la reprise.
export function doitRedessiner({ pause, imageFinalePosee, evenementEnAttente }) {
  return !pause || !imageFinalePosee || Boolean(evenementEnAttente);
}
