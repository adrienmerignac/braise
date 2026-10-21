import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '../..');
const lire = chemin => readFileSync(resolve(racine, chemin), 'utf8');

test('le gabarit « Retour de partie » déclare ses champs et une étiquette existante', () => {
  const yml = lire('.github/ISSUE_TEMPLATE/retour-joueur.yml');
  assert.match(yml, /^name: Retour de partie$/m);
  assert.match(yml, /^labels: \["recette"\]$/m);
  assert.match(yml, /^body:$/m);
  for (const id of ['appareil', 'temps-joue', 'incomprehension', 'bug-etapes', 'bug-attendu', 'bug-obtenu', 'perf', 'sauvegarde']) {
    assert.match(yml, new RegExp(`^    id: ${id}$`, 'm'), `champ ${id} manquant`);
  }
});

test('le guide testeur renvoie vers le formulaire et rappelle l’absence de données envoyées', () => {
  const guide = lire('docs/BETA.md');
  assert.match(guide, /issues\/new\?template=retour-joueur\.yml/);
  assert.match(guide, /n'envoie aucune donnée/);
  assert.match(lire('README.md'), /\[Donner un retour\]\(docs\/BETA\.md\)/);
});
