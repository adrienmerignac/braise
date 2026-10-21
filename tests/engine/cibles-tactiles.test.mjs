import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../dist/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../dist/style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const CIBLES = ['button', 'select', 'input', 'summary'];
const MIN = 44;

// Règles `min-height` en px/rem, y compris dans les @media (aplatis : la règle globale vaut sur tous les formats).
function reglesMinHeight() {
  const regles = [];
  for (const [, sel, corps] of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const m = corps.match(/(?:^|;)\s*min-height:\s*([\d.]+)(px|rem)/);
    if (!m) continue;
    const px = Number(m[1]) * (m[2] === 'rem' ? 16 : 1);
    if (px >= MIN) regles.push(...sel.split(',').map(s => s.trim()));
  }
  return regles;
}

function elements() {
  const liste = [];
  for (const [, balise, attrs] of html.matchAll(/<(button|select|input|summary)\b([^>]*)>/g)) {
    const id = attrs.match(/\bid="([^"]+)"/)?.[1];
    const classes = (attrs.match(/\bclass="([^"]+)"/)?.[1] ?? '').split(/\s+/).filter(Boolean);
    const type = attrs.match(/\btype="([^"]+)"/)?.[1];
    if (balise === 'input' && type === 'hidden') continue;
    liste.push({ balise, id, classes, hidden: /\bhidden\b/.test(attrs) && balise === 'input' });
  }
  return liste;
}

// Seuls les sélecteurs simples (sans ancêtre) comptent : sans DOM, un `.parent button` ne prouve rien pour un autre bouton.
// Balise, .classe, #id ; états et attributs ignorés.
function couvre(selecteur, el) {
  if (/[\s>+~]/.test(selecteur)) return false;
  const compose = selecteur.replace(/:not\([^)]*\)|\[[^\]]*\]|::?[\w-]+(\([^)]*\))?/g, '');
  const balise = compose.match(/^[a-z]+/)?.[0];
  if (balise && balise !== el.balise) return false;
  const classes = [...compose.matchAll(/\.([\w-]+)/g)].map(m => m[1]);
  const id = compose.match(/#([\w-]+)/)?.[1];
  return classes.every(c => el.classes.includes(c)) && (!id || id === el.id);
}

test('le HTML contient bien des éléments interactifs à contrôler', () => {
  const trouves = new Set(elements().map(e => e.balise));
  for (const b of ['button', 'select', 'input']) assert.ok(trouves.has(b), `aucun <${b}> trouvé : le test ne vérifierait rien`);
});

test('chaque button, select, input et summary est couvert par un min-height ≥ 44px', () => {
  const regles = reglesMinHeight();
  for (const el of elements().filter(e => !e.hidden)) {
    const nom = `<${el.balise}${el.id ? ' #' + el.id : ''}>`;
    assert.ok(regles.some(r => couvre(r, el)), `${nom} sans règle min-height ≥ ${MIN}px`);
  }
});
