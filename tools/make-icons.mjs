// Génère les icônes PWA depuis portrait.png (couches LPC créditées), sans retouche : recadrage + agrandissement
// au plus proche voisin, sur le fond de la feuille de style. Usage : node tools/make-icons.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync, deflateSync, crc32 } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FOND = [0x15, 0x1a, 0x18, 255]; // #151a18, theme-color de index.html
const MARGE_SURE = 0.2; // zone de sécurité « maskable » : 20 % de chaque côté

function lirePng(octets) {
  let largeur = 0; let hauteur = 0; const idat = [];
  for (let i = 8; i < octets.length;) {
    const taille = octets.readUInt32BE(i); const type = octets.toString('ascii', i + 4, i + 8);
    const donnees = octets.subarray(i + 8, i + 8 + taille);
    if (type === 'IHDR') { largeur = donnees.readUInt32BE(0); hauteur = donnees.readUInt32BE(4); if (donnees[8] !== 8 || donnees[9] !== 6) throw new Error('RGBA 8 bits attendu'); }
    if (type === 'IDAT') idat.push(donnees);
    i += 12 + taille;
  }
  const brut = inflateSync(Buffer.concat(idat)); const ligne = largeur * 4; const px = Buffer.alloc(ligne * hauteur);
  for (let y = 0; y < hauteur; y++) {
    const filtre = brut[y * (ligne + 1)]; const src = y * (ligne + 1) + 1;
    for (let x = 0; x < ligne; x++) {
      const a = x >= 4 ? px[y * ligne + x - 4] : 0; const b = y ? px[(y - 1) * ligne + x] : 0; const c = x >= 4 && y ? px[(y - 1) * ligne + x - 4] : 0;
      const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filtre];
      px[y * ligne + x] = (brut[src + x] + pred) & 255;
    }
  }
  return { largeur, hauteur, px };
}

function ecrirePng(largeur, hauteur, px) {
  const bloc = (type, donnees) => {
    const tete = Buffer.alloc(8); tete.writeUInt32BE(donnees.length, 0); tete.write(type, 4, 'ascii');
    const fin = Buffer.alloc(4); fin.writeUInt32BE(crc32(Buffer.concat([tete.subarray(4), donnees])), 0);
    return Buffer.concat([tete, donnees, fin]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(largeur, 0); ihdr.writeUInt32BE(hauteur, 4); ihdr[8] = 8; ihdr[9] = 6;
  const brut = Buffer.alloc((largeur * 4 + 1) * hauteur);
  for (let y = 0; y < hauteur; y++) px.copy(brut, y * (largeur * 4 + 1) + 1, y * largeur * 4, (y + 1) * largeur * 4);
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), bloc('IHDR', ihdr), bloc('IDAT', deflateSync(brut, { level: 9 })), bloc('IEND', Buffer.alloc(0))]);
}

const portrait = lirePng(readFileSync(resolve(root, 'dist/assets/lpc/portrait.png')));
// Boîte englobante des pixels non transparents, rendue carrée.
let [x0, y0, x1, y1] = [portrait.largeur, portrait.hauteur, -1, -1];
for (let y = 0; y < portrait.hauteur; y++) for (let x = 0; x < portrait.largeur; x++) {
  if (portrait.px[(y * portrait.largeur + x) * 4 + 3] > 0) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
}
const cote = Math.max(x1 - x0 + 1, y1 - y0 + 1);
const ox = Math.round((x0 + x1 + 1 - cote) / 2); const oy = Math.round((y0 + y1 + 1 - cote) / 2);
const source = (x, y) => {
  const sx = ox + x; const sy = oy + y;
  if (sx < 0 || sy < 0 || sx >= portrait.largeur || sy >= portrait.hauteur) return null;
  const i = (sy * portrait.largeur + sx) * 4; return portrait.px[i + 3] ? portrait.px.subarray(i, i + 4) : null;
};

// `taille` : côté de l'icône ; `part` : fraction du côté occupée par le visuel (le reste est du fond).
// Le facteur est entier pour garder des pixels nets ; le visuel est centré.
function icone(taille, part) {
  const facteur = Math.max(1, Math.floor((taille * part) / cote)); const dessin = cote * facteur;
  const decalage = Math.floor((taille - dessin) / 2); const px = Buffer.alloc(taille * taille * 4);
  for (let y = 0; y < taille; y++) for (let x = 0; x < taille; x++) {
    const dx = x - decalage; const dy = y - decalage;
    const couleur = dx >= 0 && dy >= 0 && dx < dessin && dy < dessin ? source(Math.floor(dx / facteur), Math.floor(dy / facteur)) : null;
    Buffer.from(couleur ?? FOND).copy(px, (y * taille + x) * 4);
  }
  return ecrirePng(taille, taille, px);
}

const sortie = resolve(root, 'dist/assets/icons'); mkdirSync(sortie, { recursive: true });
const maskable = 1 - 2 * MARGE_SURE;
for (const [nom, taille, part] of [['icon-192.png', 192, 0.9], ['icon-512.png', 512, 0.9], ['icon-maskable-512.png', 512, maskable], ['apple-touch-icon-180.png', 180, 0.9]]) {
  writeFileSync(resolve(sortie, nom), icone(taille, part)); console.log(nom, taille);
}
