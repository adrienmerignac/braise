import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const racine = new URL('../../', import.meta.url);
const lire = chemin => readFileSync(new URL(chemin, racine), 'utf8');

test('LICENSE est la licence MIT et CONTRIBUTING.md existe', () => {
  assert.ok(lire('LICENSE').startsWith('MIT License'));
  assert.ok(existsSync(new URL('CONTRIBUTING.md', racine)));
  assert.equal(JSON.parse(lire('package.json')).license, 'MIT');
});

test('README et crédits mentionnent la licence MIT du code', () => {
  assert.match(lire('README.md'), /\]\(LICENSE\)/);
  assert.match(lire('README.md'), /\]\(CONTRIBUTING\.md\)/);
  assert.match(lire('dist/credits.html'), /licence MIT/);
});
