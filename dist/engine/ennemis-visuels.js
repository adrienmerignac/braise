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

// Ancrage commun : bas de case à 338 et centre à enemyX + 64 quelle que soit l'échelle (la case fait 64 × scale).
export const SOL_ENNEMI = 338;
export function ancrageEnnemi(scale, enemyX = 0) {
  const shrink = 64 * (BASE_SCALE - scale);
  return { x: enemyX + shrink / 2, y: 210 + shrink, shrink };
}

// Gardien : même planche que l'Éclaireur (l'épée se lit comme une menace), plus grand, teinté braise, ombre plus large.
export const GARDIEN_LOOK = Object.freeze({ sheet: 'goblin-sword', scale: 2.6, teinte: '#ff5a1f', teinteForce: 0.28, ombreRayon: 52 });
export const gardienLook = () => ({ ...GARDIEN_LOOK, rows: ENEMY_SHEETS[GARDIEN_LOOK.sheet] });

// Séquence d'attaque du gardien, en ms depuis le coup du héros : charge (recul puis élan) juste avant la riposte (650 ms), puis le coup.
export const GARDIEN_SEQUENCE = Object.freeze({ reculDebut: 560, elanDebut: 610, coupDebut: 650, coupFin: 1000, reculPx: 14, elanPx: 22 });

// Phase, décalage horizontal (+ = vers la droite, loin du héros) et intensité de lueur (0 à 1) à `age` ms.
// Mouvement réduit : jamais de décalage, seulement la lueur. Effets discrets : lueur atténuée de moitié.
export function sequenceGardien(age, { reduit = false, discret = false } = {}) {
  const S = GARDIEN_SEQUENCE;
  let phase = 'repos', dx = 0, lueur = 0;
  if (age >= S.reculDebut && age < S.elanDebut) {
    phase = 'recul'; dx = S.reculPx * (age - S.reculDebut) / (S.elanDebut - S.reculDebut); lueur = 0.25;
  } else if (age >= S.elanDebut && age < S.coupDebut) {
    phase = 'elan'; dx = S.reculPx - (S.reculPx + S.elanPx) * (age - S.elanDebut) / (S.coupDebut - S.elanDebut); lueur = 0.5;
  } else if (age >= S.coupDebut && age < S.coupFin) {
    phase = 'coup'; const f = (age - S.coupDebut) / (S.coupFin - S.coupDebut);
    dx = -S.elanPx * (1 - f); lueur = 1 - f;
  }
  if (reduit) dx = 0;
  if (discret) lueur *= 0.5;
  return { phase, dx, lueur };
}
