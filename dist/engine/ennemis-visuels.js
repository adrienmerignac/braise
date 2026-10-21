// Apparence de chaque ennemi normal : planche, lignes et échelle sont des données, pas du code de dessin.
// Les lignes sont propres à chaque planche LPC (relevées image en main), jamais partagées par défaut.
// Par planche : `west` (ligne tournée vers l'ouest, face au héros), `cols` (cases du cycle de marche), `attack` (cases d'attaque, sinon le cycle
// de marche), `sol` (px de vide sous les pieds dans la case, rattrapés pour que les pieds touchent le sol), `death` (ligne de chute, null → fondu de la case de marche), `cell` ([largeur, hauteur] en px si ce n'est pas 64 × 64).
export const ENEMY_SHEETS = Object.freeze({
  'goblin-sword': Object.freeze({ west: 3, death: 4, cols: 9, attack: [9, 10] }),
  goblin: Object.freeze({ west: 3, death: 4, cols: 9, attack: [9, 10] }),
  bat: Object.freeze({ west: 1, death: null, cols: 3, cell: [32, 32] }),
  slime: Object.freeze({ west: 1, death: null, cols: 3, cell: [32, 32] }),
  snake: Object.freeze({ west: 1, death: null, cols: 3, cell: [32, 32] }),
  ghost: Object.freeze({ west: 1, death: null, cols: 3, cell: [40, 46] }),
  eyeball: Object.freeze({ west: 1, death: null, cols: 3, cell: [32, 38] }),
  spider: Object.freeze({ west: 1, death: null, cols: 10, sol: 12 }),
  golem: Object.freeze({ west: 1, death: null, cols: 7 }),
  imp: Object.freeze({ west: 1, death: null, cols: 4, sol: 12 }),
});
// `scale` : boîte d'ancrage (64 × scale px, voir ancrageEnnemi) ; `zoom` : agrandissement des pixels de la case (par défaut `scale`).
export const ENEMY_LOOKS = Object.freeze({
  eclaireur: Object.freeze({ sheet: 'goblin-sword', scale: 2 }),
  pillard: Object.freeze({ sheet: 'goblin', scale: 2 }),
  traqueur: Object.freeze({ sheet: 'goblin-sword', scale: 1.7 }),
  'squelette-ruines': Object.freeze({ sheet: 'spider', scale: 2.3 }),
  'chauve-souris': Object.freeze({ sheet: 'bat', scale: 2, zoom: 3 }),
  gelee: Object.freeze({ sheet: 'slime', scale: 2, zoom: 3 }),
  'squelette-cendre': Object.freeze({ sheet: 'snake', scale: 2, zoom: 3 }),
  spectre: Object.freeze({ sheet: 'ghost', scale: 2, zoom: 2.5 }),
  goule: Object.freeze({ sheet: 'eyeball', scale: 2, zoom: 3 }),
});
export const BASE_SCALE = 2;
// Type inconnu ou absent (ancien événement) : l'Éclaireur.
export const enemyLook = kind => {
  const look = ENEMY_LOOKS[kind] || ENEMY_LOOKS.eclaireur;
  return { ...look, rows: ENEMY_SHEETS[look.sheet] };
};

// Taille d'une case de la planche, son agrandissement et sa position dans la boîte d'ancrage (pieds au sol, centrée).
export const tailleCase = rows => rows.cell || [64, 64];
export function placeEnnemi(look) {
  const [cw, ch] = tailleCase(look.rows), zoom = look.zoom || look.scale;
  const w = cw * zoom, h = ch * zoom;
  return { w, h, dx: (64 * look.scale - w) / 2, dy: 64 * look.scale - h + (look.rows.sol || 0) * zoom };
}
// Colonne à afficher : cycle de marche (case 0 en mouvement réduit), cases d'attaque si la planche en a, sinon le même cycle.
export function colonneEnnemi(rows, { t = 0, attaque = false, age = 0, reduit = false } = {}) {
  if (attaque && rows.attack) return rows.attack[0] + Math.floor((age - 650) / 175) % rows.attack.length;
  return reduit ? 0 : Math.floor(t / 150) % rows.cols;
}

// Ancrage commun : bas de case à 338 et centre à enemyX + 64 quelle que soit l'échelle (la case fait 64 × scale).
export const SOL_ENNEMI = 338;
export function ancrageEnnemi(scale, enemyX = 0) {
  const shrink = 64 * (BASE_SCALE - scale);
  return { x: enemyX + shrink / 2, y: 210 + shrink, shrink };
}

// Gardien : un look par zone (planche, échelle, teinte, ombre) ; la forêt garde la planche de l'Éclaireur (l'épée se lit comme une menace).
export const GARDIEN_LOOK = Object.freeze({ sheet: 'goblin-sword', scale: 2.6, teinte: '#ff5a1f', teinteForce: 0.28, ombreRayon: 52 });
export const GARDIEN_LOOKS = Object.freeze({
  foret: GARDIEN_LOOK,
  ruines: Object.freeze({ sheet: 'golem', scale: 2.6, teinte: '#3fa7b8', teinteForce: 0.22, ombreRayon: 52 }),
  cryptes: Object.freeze({ sheet: 'imp', scale: 2.6, teinte: '#9a6bff', teinteForce: 0.18, ombreRayon: 52 }),
});
export const gardienLook = zone => {
  const look = GARDIEN_LOOKS[zone] || GARDIEN_LOOK;
  return { ...look, rows: ENEMY_SHEETS[look.sheet] };
};

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
