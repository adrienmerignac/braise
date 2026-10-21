// Décors des zones : des données pures (aucun DOM). La scène recompose le fond hors écran une fois par changement de zone.
// Les tuiles sont des cases de 32 px prises dans les planches LPC listées dans `fichiers` (déclarées dans sources.json et le manifeste).
import { ZONE_IDS, BESTIAIRE } from './balance.js';
import { ENEMY_LOOKS, gardienLook } from './ennemis-visuels.js';

export const TRANSITION_MS = 300;
export const ZONE_PAR_DEFAUT = 'foret';
// Atténuation des animations d'ambiance en « effets discrets ».
export const FORCE_DISCRETE = 0.4;

// `sol` : cases alternées sur toute la scène ; `chemin` : ellipse de sol battu (forêt) ; `mur` : bandeau arrière (ruines, cryptes) ;
// `eau` : tuile d'eau et bassins `[x, y, rx, ry]` ; `accessoires` : `[fichier, sx, sy, sw, sh, x, y, w, h]` posés avant les acteurs.
// `eclairage` : voile de teinte plein cadre, dégradé haut/bas et lueur du feu de camp. `animation` : ambiance propre à la zone.
export const DECORS = Object.freeze({
  foret: {
    fichiers: ['grass', 'dirt', 'treetop', 'trunk', 'rock'],
    sol: { fichier: 'grass', cases: [[0, 160], [32, 160], [64, 160]], repli: '#3c6235' },
    chemin: { fichier: 'dirt', sx: 32, sy: 160 },
    mur: null, eau: null, accessoires: [],
    eclairage: { voile: '#15233255', haut: '#101d3b88', bas: '#07151d77', feu: 1 },
    animation: null
  },
  ruines: {
    fichiers: ['castlefloors', 'castlewalls', 'water'],
    sol: { fichier: 'castlefloors', cases: [[224, 160], [192, 192], [160, 224]], repli: '#4a5668' },
    chemin: null,
    mur: { fichier: 'castlewalls', cases: [[0, 256], [64, 224], [0, 288]], hauteur: 160, trous: [[256, 64], [640, 96]], repli: '#59675f' },
    eau: { fichier: 'water', sx: 32, sy: 160, bassins: [[560, 430, 230, 46], [150, 170, 110, 22]] },
    accessoires: [['castlewalls', 0, 0, 32, 160, 40, 10, 48, 240], ['castlewalls', 0, 0, 32, 160, 850, 20, 48, 240]],
    eclairage: { voile: '#1d3b6a40', haut: '#18305c99', bas: '#0a1c3a88', feu: 0.8 },
    animation: 'reflets'
  },
  cryptes: {
    fichiers: ['castlefloors', 'dungeon'],
    sol: { fichier: 'castlefloors', cases: [[64, 64], [96, 64], [64, 96]], repli: '#2c2338' },
    chemin: null,
    mur: { fichier: 'dungeon', cases: [[32, 32], [64, 32], [32, 64]], hauteur: 192, trous: [], repli: '#4a2a22' },
    eau: null,
    accessoires: [['dungeon', 200, 0, 32, 64, 60, 100, 48, 96], ['dungeon', 200, 0, 32, 64, 860, 100, 48, 96]],
    eclairage: { voile: '#2a0f0a50', haut: '#120606cc', bas: '#0a0405aa', feu: 1.5 },
    animation: 'braises'
  }
});

// Zone inconnue (sauvegarde ancienne ou événement incomplet) : la forêt.
export const idDecor = zone => (ZONE_IDS.includes(zone) ? zone : ZONE_PAR_DEFAUT);
export const decorDeZone = zone => DECORS[idDecor(zone)];
export const fichiersDecor = zone => decorDeZone(zone).fichiers;
export const tousFichiersDecor = () => [...new Set(ZONE_IDS.flatMap(fichiersDecor))];

// Planches nécessaires au premier combat d'une zone : ennemis ordinaires, gardien et décor, sans doublon ; zone inconnue : la forêt.
export function fichiersDeZone(zone) {
  const id = idDecor(zone);
  const ennemis = BESTIAIRE[id].types.map(type => ENEMY_LOOKS[type].sheet);
  return [...new Set([...ennemis, gardienLook(id).sheet, ...fichiersDecor(id)])];
}
// Planches chargées en arrière-plan quelle que soit la zone (coffres).
export const FICHIERS_COMMUNS = Object.freeze(['chests']);
// Toutes les planches hors couches du héros : les trois zones plus les communes.
export const toutesPlanchesMonde = () => [...new Set([...ZONE_IDS.flatMap(fichiersDeZone), ...FICHIERS_COMMUNS])];

// Animation d'ambiance : aucune en mouvement réduit ; atténuée en effets discrets.
export function animationDecor(zone, { reduit = false, discret = false } = {}) {
  const nom = decorDeZone(zone).animation;
  if (!nom || reduit) return null;
  return { nom, force: discret ? FORCE_DISCRETE : 1 };
}
export const dureeTransition = ({ reduit = false } = {}) => (reduit ? 0 : TRANSITION_MS);
// Opacité du voile noir : monte à 1 à mi-durée (moment où le fond change) puis redescend ; 0 hors transition.
export function opaciteFondu(age, duree = TRANSITION_MS) {
  if (!(duree > 0) || age < 0 || age >= duree) return 0;
  return 1 - Math.abs(age - duree / 2) / (duree / 2);
}
