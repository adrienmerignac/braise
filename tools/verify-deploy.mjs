// Vérifie qu'un site déployé sert la version de package.json et les fichiers référencés par dist/index.html.
// Usage : node tools/verify-deploy.mjs <url-de-base> [--version X] [--fichier chemin]... [--essais N] [--delai ms]
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ESSAIS_PAR_DEFAUT = 5;
const DELAI_PAR_DEFAUT_MS = 10_000;
const FICHIERS_ECHANTILLON = ['game.js', 'scene.js', 'credits.html', 'assets/lpc/body-walk.png'];

function lireOptions(argv) {
  const options = { url: null, version: null, fichiers: [], essais: ESSAIS_PAR_DEFAUT, delai: DELAI_PAR_DEFAUT_MS };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--version') options.version = argv[++i];
    else if (arg === '--fichier') options.fichiers.push(argv[++i]);
    else if (arg === '--essais') options.essais = Number(argv[++i]);
    else if (arg === '--delai') options.delai = Number(argv[++i]);
    else if (!options.url && !arg.startsWith('--')) options.url = arg;
    else throw new Error(`Option inconnue : ${arg}`);
  }
  if (!options.url) throw new Error('URL de base manquante');
  if (!(options.essais >= 1) || !(options.delai >= 0)) throw new Error('--essais (≥ 1) et --delai (≥ 0) invalides');
  return options;
}

export function referencesLocales(html) {
  const refs = new Set();
  for (const [, ref] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) continue;
    const chemin = ref.split(/[?#]/)[0];
    if (chemin && chemin !== './') refs.add(chemin.replace(/^\.\//, ''));
  }
  return [...refs];
}

async function verifierUneFois(base, version, fichiers) {
  const problemes = [];
  const index = await fetch(new URL('index.html', base));
  if (index.status !== 200) problemes.push(`index.html : HTTP ${index.status} au lieu de 200`);
  else {
    const corps = await index.text();
    if (!new RegExp(`(?<![\\d.])${version.replace(/\./g, '\\.')}(?![\\d.]*\\d)`).test(corps)) {
      problemes.push(`index.html : la version ${version} n'apparaît pas dans la page servie`);
    }
  }
  for (const fichier of fichiers) {
    try {
      const reponse = await fetch(new URL(fichier, base));
      await reponse.arrayBuffer();
      if (reponse.status !== 200) problemes.push(`${fichier} : HTTP ${reponse.status} au lieu de 200`);
    } catch (erreur) {
      problemes.push(`${fichier} : ${erreur.message}`);
    }
  }
  return problemes;
}

async function main() {
  const options = lireOptions(process.argv.slice(2));
  const base = options.url.endsWith('/') ? options.url : `${options.url}/`;
  const version = options.version ?? JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
  const refs = referencesLocales(readFileSync(resolve(root, 'dist/index.html'), 'utf8'));
  const fichiers = [...new Set([...FICHIERS_ECHANTILLON, ...refs, ...options.fichiers])];
  console.log(`Vérification de ${base} : version attendue ${version}, ${fichiers.length + 1} fichiers.`);
  let problemes = [];
  for (let essai = 1; essai <= options.essais; essai++) {
    try {
      problemes = await verifierUneFois(base, version, fichiers);
    } catch (erreur) {
      problemes = [`site injoignable : ${erreur.message}`];
    }
    if (!problemes.length) {
      console.log(`OK : le site sert la version ${version} et tous les fichiers (essai ${essai}/${options.essais}).`);
      return 0;
    }
    console.log(`Essai ${essai}/${options.essais} en échec :\n${problemes.map(p => `  - ${p}`).join('\n')}`);
    if (essai < options.essais) await new Promise(fin => setTimeout(fin, options.delai));
  }
  console.error(`ÉCHEC : le site déployé ne correspond pas à la version ${version}.`);
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().then(code => process.exit(code), erreur => { console.error(`Erreur : ${erreur.message}`); process.exit(1); });
}
