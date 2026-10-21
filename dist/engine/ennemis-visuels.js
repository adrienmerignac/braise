// Apparence de chaque ennemi normal : planche, lignes et échelle sont des données, pas du code de dessin.
// Les lignes sont propres à chaque planche LPC (relevées image en main), jamais partagées par défaut.
export const ENEMY_SHEETS = Object.freeze({
  'goblin-sword': Object.freeze({ west: 3, death: 4 }),
  goblin: Object.freeze({ west: 3, death: 4 }),
});
export const ENEMY_LOOKS = Object.freeze({
  eclaireur: Object.freeze({ sheet: 'goblin-sword', scale: 2 }),
  pillard: Object.freeze({ sheet: 'goblin', scale: 2 }),
  traqueur: Object.freeze({ sheet: 'goblin-sword', scale: 1.7 }),
});
export const BASE_SCALE = 2;
// Type inconnu ou absent (ancien événement) : l'Éclaireur.
export const enemyLook = kind => {
  const look = ENEMY_LOOKS[kind] || ENEMY_LOOKS.eclaireur;
  return { ...look, rows: ENEMY_SHEETS[look.sheet] };
};
