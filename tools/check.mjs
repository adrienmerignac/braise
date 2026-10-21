import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
const errors = [];
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
const files = walk(dist);
for (const path of files.filter(path => path.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(`${relative(root, path)}: ${result.stderr || result.error}`);
}
for (const path of files.filter(path => path.endsWith('.html'))) {
  for (const [, reference] of readFileSync(path, 'utf8').matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;
    const target = reference.split(/[?#]/)[0];
    const local = target.startsWith('/') ? resolve(dist, `.${target}`) : resolve(dirname(path), target);
    if (!existsSync(local)) errors.push(`${relative(root, path)}: référence manquante ${reference}`);
  }
}
const testsDir = resolve(root, 'tests');
const testFiles = existsSync(testsDir) ? walk(testsDir).filter(path => path.endsWith('.test.mjs')) : [];
const tests = spawnSync(process.execPath, ['--test', ...testFiles], { cwd: root, encoding: 'utf8' });
if (tests.status !== 0) errors.push(`Tests Node en échec :\n${tests.stdout}${tests.stderr}`);
const documents = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'ROADMAP.md']
  .map(path => resolve(root, path)).concat(walk(resolve(root, 'docs')));
for (const path of documents.filter(path => path.endsWith('.md'))) {
  for (const [, reference] of readFileSync(path, 'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;
    const target = reference.split(/[?#]/)[0];
    if (!existsSync(resolve(dirname(path), target))) {
      errors.push(`${relative(root, path)}: lien documentaire manquant ${reference}`);
    }
  }
}
// Frame bounds used by the scene: catch missing/truncated or incompatible sheets.
for (const [name, width, height] of [
  ['hero-walk', 576, 256], ['hero-swing', 384, 256],
  ['goblin-sword', 704, 320], ['grass', 96, 192],
  ['dirt', 64, 192], ['treetop', 96, 224], ['trunk', 90, 80], ['rock', 64, 32],
]) {
  const path = resolve(dist, `assets/lpc/${name}.png`);
  if (!existsSync(path)) { errors.push(`Sprite manquant : ${name}`); continue; }
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') {
    errors.push(`PNG invalide : ${name}`); continue;
  }
  if (bytes.readUInt32BE(16) < width || bytes.readUInt32BE(20) < height) {
    errors.push(`Planche ${name} trop petite pour les frames du rendu (${width} × ${height} minimum)`);
  }
}
// Assets : chaque PNG servi est déclaré au manifeste (licence connue, empreinte identique).
const manifest = JSON.parse(readFileSync(resolve(root, 'tools/assets-manifest.json'), 'utf8'));
const declared = new Map(manifest.fichiers.map(entry => [entry.chemin, entry]));
for (const path of files.filter(path => path.endsWith('.png') && relative(dist, path).startsWith('assets/'))) {
  const rel = relative(dist, path).split('\\').join('/');
  const entry = declared.get(rel);
  if (!entry) { errors.push(`${rel}: PNG absent de tools/assets-manifest.json (source et licence à déclarer)`); continue; }
  if (!manifest.licences.includes(entry.licence)) errors.push(`${rel}: licence inconnue « ${entry.licence} »`);
  const sha = createHash('sha256').update(readFileSync(path)).digest('hex');
  if (sha !== entry.sha256) errors.push(`${rel}: empreinte sha256 différente du manifeste (fichier modifié ?)`);
}
for (const rel of declared.keys()) {
  if (!existsSync(resolve(dist, rel))) errors.push(`${rel}: déclaré au manifeste mais fichier manquant`);
}
for (const rel of ['assets/LICENSE-Kenney.txt', 'assets/lpc/LICENSE.txt', 'assets/lpc/LICENSE-CC-BY-SA-3.0.txt']) {
  if (!existsSync(resolve(dist, rel))) errors.push(`${rel}: fichier de licence manquant`);
}
const hosting = JSON.parse(readFileSync(resolve(root, '.openai/hosting.json'), 'utf8'));
if (!hosting.project_id || hosting.static?.directory !== 'dist') errors.push('Manifest Sites statique invalide');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('OK — syntaxe JS, liens HTML/docs locaux, tests Node, sprites et manifest statique.');
