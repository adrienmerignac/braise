import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Les couleurs sont lues dans dist/style.css (et dans le <style> de credits.html) : changer une teinte
// fait varier ce test. Seuils WCAG 2.1 : 4,5 pour le texte courant, 3 pour le grand texte et les contours.
const css = readFileSync(new URL('../../dist/style.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/@import[^;]*;/g, '');
const credits = readFileSync(new URL('../../dist/credits.html', import.meta.url), 'utf8');
const TEXTE = 4.5;
const CONTROLE = 3;

const vars = Object.fromEntries([...css.matchAll(/(--[a-z-]+):(#[0-9a-f]{3,8})/gi)].map(m => [m[1], m[2]]));

// Dernière valeur déclarée pour `propriete` dans une règle dont le sélecteur est exactement `selecteur`.
function declare(source, selecteur, propriete) {
  const valeurs = [];
  for (const regle of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!regle[1].split(',').map(s => s.trim()).includes(selecteur)) continue;
    for (const d of regle[2].split(';')) {
      const [nom, ...reste] = d.split(':');
      if (nom.trim() === propriete) valeurs.push(reste.join(':').trim());
    }
  }
  assert.ok(valeurs.length, `${selecteur} { ${propriete} } introuvable`);
  return valeurs.at(-1);
}

function couleur(valeur) {
  const v = valeur.match(/var\((--[a-z-]+)\)/)?.[1];
  const hex = (v ? vars[v] : valeur.match(/#[0-9a-f]{3,8}/i)?.[0]);
  assert.ok(hex, `couleur illisible : ${valeur}`);
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  const n = i => parseInt(h.slice(i, i + 2), 16);
  return { rgb: [n(0), n(2), n(4)], a: h.length === 8 ? n(6) / 255 : 1 };
}

const lire = (source, sel, prop) => couleur(declare(source, sel, prop));
const melange = (avant, arriere, a = avant.a) => ({ rgb: avant.rgb.map((v, i) => v * a + arriere.rgb[i] * (1 - a)), a: 1 });

function luminance({ rgb }) {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const variable = nom => couleur(`var(${nom})`);
const bg = variable('--bg');
const panel = variable('--panel');
const resources = lire(css, '.resources', 'background');
const muted = variable('--muted');
const orange = variable('--orange');
const texte = lire(css, 'body', 'color');
const scene = lire(css, '.scene', 'background'); // dernier fond déclaré ; le canvas se dessine par-dessus
const carteEnnemi = melange(lire(css, '.enemy-card', 'background'), scene);
const etiquetteScene = melange(lire(css, '.scene-label', 'background'), scene);
const secondaire = { fond: lire(css, '.secondary', 'background'), texte: lire(css, '.secondary', 'color') };
const primaire = { fond: lire(css, '.primary', 'background'), texte: lire(css, '.primary', 'color') };
// Valeur réellement appliquée à un bouton désactivé placé sous `contexte` : cascade (spécificité, puis ordre).
const CONTEXTES = ['', '.upgrade', '.guide-panel', '.audio-bar', '.boss-panel', 'dialog'];
function specificite(sel) {
  const classes = (sel.match(/\.[\w-]+|:[\w-]+|\[[^\]]*\]/g) || []).length;
  return [(sel.match(/#[\w-]+/g) || []).length, classes, (sel.match(/(^|\s)[a-z][\w-]*/g) || []).length];
}
const comparer = (a, b) => a.reduce((acc, v, i) => acc || v - b[i], 0);
function appliquee(contexte, propriete) {
  let gagnant = null;
  for (const regle of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    for (const sel of regle[1].split(',').map(s => s.trim())) {
      const m = sel.match(/^(?:(\S+) )?button(:disabled)?$/);
      if (!m || (m[1] && m[1] !== contexte)) continue;
      const d = regle[2].split(';').map(x => x.split(':')).filter(([n]) => n.trim() === propriete).at(-1);
      if (!d) continue;
      const spec = specificite(sel);
      const bat = !gagnant || comparer(spec, gagnant.spec) >= 0; // à égalité, la règle la plus tardive gagne
      if (bat) gagnant = { spec, valeur: d.slice(1).join(':').trim() };
    }
  }
  return gagnant?.valeur;
}
const achat = { fond: lire(css, '.upgrade button', 'background'), texte: lire(css, '.upgrade button', 'color') };
const inactif = { fond: couleur(appliquee('.upgrade', 'background')), texte: couleur(appliquee('.upgrade', 'color')) };
const controle = variable('--control');
const creditsStyle = credits.match(/<style>([^<]*)<\/style>/)[1];
const creditsLien = couleur(credits.match(/<a href="\.\/" style="color:(#[0-9a-f]{6})"/i)[1]);

// [libellé, premier plan, fond, seuil] — texte courant : 4,5 ; contours et grand texte : 3.
const paires = [
  ['texte courant / fond de page', texte, bg, TEXTE],
  ['texte courant / panneau', texte, panel, TEXTE],
  ['--muted / fond de page', muted, bg, TEXTE],
  ['--muted / panneau', muted, panel, TEXTE],
  ['--muted / bandeau des ressources', muted, resources, TEXTE],
  ['--orange / panneau (valeurs, titre du gardien, guide)', orange, panel, TEXTE],
  ['--green / panneau', variable('--green'), panel, TEXTE],
  ['étiquette .tag / panneau', lire(css, '.tag', 'color'), panel, TEXTE],
  ['journal .log / panneau', lire(css, '.log p', 'color'), panel, TEXTE],
  ['dialogues bienvenue/absence / panneau', lire(css, 'dialog', 'color'), lire(css, 'dialog', 'background'), TEXTE],
  ['bouton principal', primaire.texte, primaire.fond, TEXTE],
  ['bouton principal, détail à 80 %', melange({ rgb: primaire.texte.rgb, a: 0.8 }, primaire.fond), primaire.fond, TEXTE],
  ['bouton secondaire', secondaire.texte, secondaire.fond, TEXTE],
  ['bouton secondaire, détail à 80 %', melange({ rgb: secondaire.texte.rgb, a: 0.8 }, secondaire.fond), secondaire.fond, TEXTE],
  ['bouton d’achat', achat.texte, achat.fond, TEXTE],
  ['bouton désactivé ou trop cher', inactif.texte, inactif.fond, TEXTE],
  ['bouton désactivé, détail à 80 %', melange({ rgb: inactif.texte.rgb, a: 0.8 }, inactif.fond), inactif.fond, TEXTE],
  ['bouton désactivé / panneau', inactif.texte, panel, TEXTE],
  ['boutons du gardien, du guide, des dialogues', lire(css, '.guide-panel button:enabled', 'color'), lire(css, '.guide-panel button:enabled', 'background'), TEXTE],
  ['barre audio : bouton actif', lire(css, '.audio-bar button', 'color'), panel, TEXTE],
  ['barre audio : bouton coupé (--muted)', muted, bg, TEXTE],
  ['réglages : liste déroulante', lire(css, '.reglage select', 'color'), bg, TEXTE],
  ['réglages : options', lire(css, '.reglage select option', 'color'), lire(css, '.reglage select option', 'background'), TEXTE],
  ['nom de scène / bandeau sur la scène', texte, etiquetteScene, TEXTE],
  ['mention de scène / bandeau sur la scène', lire(css, '.scene-label span', 'color'), etiquetteScene, TEXTE],
  ['carte ennemie / scène', texte, carteEnnemi, TEXTE],
  ['guide : indice orange / panneau', orange, panel, TEXTE],
  ['crédits : texte', lire(creditsStyle, 'p', 'color'), bg, TEXTE],
  ['crédits : liens', lire(creditsStyle, 'a', 'color'), bg, TEXTE],
  ['crédits : lien de retour', creditsLien, bg, TEXTE],
  // Contours et indicateurs : 3:1.
  ['contour de focus / panneau', lire(css, 'a:focus-visible', 'outline'), panel, CONTROLE],
  ['contour de focus / fond de page', orange, bg, CONTROLE],
  ['contour des contrôles / panneau', controle, panel, CONTROLE],
  ['contour des contrôles / fond de page', controle, bg, CONTROLE],
  ['contour du bouton secondaire / panneau', lire(css, '.secondary', 'border-color'), panel, CONTROLE],
  ['alerte mortelle (bord) / panneau', lire(css, '.d-mortel', 'border-color'), panel, CONTROLE],
  ['étape de gardien atteinte / panneau', lire(css, '.dots .done', 'background'), panel, CONTROLE],
  ['étape de gardien à venir (contour) / panneau', controle, panel, CONTROLE],
];

for (const [nom, avant, arriere, seuil] of paires) {
  test(`contraste ≥ ${seuil}:1 — ${nom}`, () => {
    const r = ratio(avant, arriere);
    assert.ok(r >= seuil, `${nom} : ${r.toFixed(2)}:1 sous le seuil de ${seuil}:1`);
  });
}

test('la taille de texte « Grand » ne change aucune couleur', () => {
  const regle = css.match(/\[data-texte=grand\]\{([^}]*)\}/)[1];
  assert.equal(regle.replace(/\s/g, ''), '--texte:125%');
});

test('un bouton désactivé ne se distingue pas que par la couleur : bord pointillé, sans opacité', () => {
  assert.match(declare(css, 'button:disabled', 'border'), /dashed/);
  assert.throws(() => declare(css, 'button:disabled', 'opacity'));
});

test('l’état désactivé gagne la cascade dans chaque contexte (achat, guide, barre audio, gardien, dialogues)', () => {
  for (const contexte of CONTEXTES) {
    const lieu = contexte || 'bouton nu';
    assert.equal(couleur(appliquee(contexte, 'background')).rgb.join(), variable('--off-bg').rgb.join(), `${lieu} : fond`);
    assert.equal(couleur(appliquee(contexte, 'color')).rgb.join(), variable('--off-fg').rgb.join(), `${lieu} : texte`);
    assert.match(appliquee(contexte, 'border'), /dashed/, `${lieu} : bord pointillé`);
  }
});
