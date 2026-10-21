import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = join(root, 'dist');

function servirDist() {
  const serveur = createServer(async (req, res) => {
    const chemin = new URL(req.url, 'http://x').pathname.replace(/\/$/, '/index.html');
    const fichier = normalize(join(dist, chemin));
    if (!fichier.startsWith(dist)) { res.writeHead(403).end(); return; }
    try {
      const contenu = await readFile(fichier);
      res.writeHead(200, { 'content-type': extname(fichier) === '.html' ? 'text/html' : 'application/octet-stream' }).end(contenu);
    } catch { res.writeHead(404).end('absent'); }
  });
  return new Promise(ok => serveur.listen(0, '127.0.0.1', () => ok(serveur)));
}

function lancer(...args) {
  return new Promise(ok => {
    const enfant = spawn(process.execPath, [join(root, 'tools/verify-deploy.mjs'), ...args, '--essais', '2', '--delai', '10'], { cwd: root });
    let sortie = '';
    enfant.stdout.on('data', d => { sortie += d; });
    enfant.stderr.on('data', d => { sortie += d; });
    enfant.on('close', code => ok({ code, sortie }));
  });
}

test('verify-deploy : succès sur dist/, échec sur version ou fichier manquant', async () => {
  const serveur = await servirDist();
  const url = `http://127.0.0.1:${serveur.address().port}/`;
  try {
    const bon = await lancer(url);
    assert.equal(bon.code, 0, bon.sortie);
    const mauvaiseVersion = await lancer(url, '--version', '99.0.0');
    assert.equal(mauvaiseVersion.code, 1, mauvaiseVersion.sortie);
    assert.match(mauvaiseVersion.sortie, /99\.0\.0/);
    const manquant = await lancer(url, '--fichier', 'absent.js');
    assert.equal(manquant.code, 1, manquant.sortie);
    assert.match(manquant.sortie, /absent\.js : HTTP 404/);
  } finally {
    serveur.close();
  }
});

test('verify-deploy : site injoignable → code 1', async () => {
  const serveur = await servirDist();
  const url = `http://127.0.0.1:${serveur.address().port}/`;
  serveur.close();
  const resultat = await lancer(url);
  assert.equal(resultat.code, 1, resultat.sortie);
});
