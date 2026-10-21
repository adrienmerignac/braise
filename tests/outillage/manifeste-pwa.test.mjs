import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const dist = new URL('../../dist/', import.meta.url);
const manifeste = JSON.parse(readFileSync(new URL('manifest.webmanifest', dist), 'utf8'));
const html = readFileSync(new URL('index.html', dist), 'utf8');

const dimensionsPng = chemin => {
  const octets = readFileSync(new URL(chemin, dist));
  assert.equal(octets.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${chemin} n'est pas un PNG`);
  return `${octets.readUInt32BE(16)}x${octets.readUInt32BE(20)}`;
};

test('le manifeste porte les champs décidés et des chemins relatifs', () => {
  assert.equal(manifeste.name, 'Braise · Idle RPG');
  assert.equal(manifeste.short_name, 'Braise');
  assert.equal(manifeste.start_url, './');
  assert.equal(manifeste.scope, './');
  assert.equal(manifeste.display, 'standalone');
  assert.equal(manifeste.lang, 'fr');
  for (const icone of manifeste.icons) assert.ok(!icone.src.startsWith('/'), icone.src);
});

test('chaque icône citée existe avec la taille annoncée, maskable comprise', () => {
  assert.deepEqual(manifeste.icons.map(i => `${i.sizes}:${i.purpose}`).sort(), ['192x192:any', '512x512:any', '512x512:maskable']);
  for (const icone of manifeste.icons) {
    assert.ok(existsSync(new URL(icone.src, dist)), icone.src);
    assert.equal(dimensionsPng(icone.src), icone.sizes, icone.src);
  }
});

test('index.html référence le manifeste, l’icône Apple 180 et la couleur de thème', () => {
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  const apple = html.match(/<link rel="apple-touch-icon" sizes="180x180" href="([^"]+)">/);
  assert.ok(apple, 'apple-touch-icon 180 manquant');
  assert.equal(dimensionsPng(apple[1]), '180x180');
  assert.match(html, new RegExp(`<meta name="theme-color" content="${manifeste.theme_color}">`));
});
