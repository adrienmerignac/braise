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
const hosting = JSON.parse(readFileSync(resolve(root, '.openai/hosting.json'), 'utf8'));
if (!hosting.project_id || hosting.static?.directory !== 'dist') errors.push('Manifest Sites statique invalide');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('OK — syntaxe JS, liens HTML/docs locaux, sprites et manifest statique.');
