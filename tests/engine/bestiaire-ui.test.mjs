import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { decrireBestiaire, bestiaireNeuf, cleGardien } from '../../dist/engine/bestiaire.js';

const BASE = { version: 8, gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1_000_000, guide: 'done', vus: ['gardien', 'absence'], recitsLus: ['braise'] };
const avec = async (options, scenario) => { const jeu = await lancerJeu(options); try { await scenario(jeu); } finally { jeu.fermer(); } };
const textes = li => li.children.map(c => c.textContent);

test('entrée vue : nom, modificateur et victoires ; gardien libellé « Gardien »', () => {
  const b = bestiaireNeuf();
  b['squelette-ruines'] = { vus: true, victoires: 3 };
  b[cleGardien('foret')] = { vus: true, victoires: 1 };
  const zones = decrireBestiaire({ bestiaire: b });
  const ruines = zones.find(z => z.zone === 'ruines');
  assert.deepEqual(ruines.entrees[0], { cle: 'squelette-ruines', vu: true, gardien: false, nom: 'Araignée des ruines', modificateur: 'Résiste aux coups · vulnérable à la braise', victoires: '3 victoires', detail: '' });
  const g = zones[0].entrees.at(-1);
  assert.equal(g.gardien, true);
  assert.equal(g.nom, 'Le Gardien de braise');
  assert.equal(g.victoires, '1 victoire');
});

test('entrée non vue : « ??? » sans nom ni modificateur ; compteur de zone juste', () => {
  const b = bestiaireNeuf();
  b.eclaireur.vus = true;
  b.pillard.vus = true;
  const [foret, ruines] = decrireBestiaire({ bestiaire: b });
  assert.equal(foret.compteur, '2/4 rencontrés');
  assert.equal(ruines.compteur, '0/4 rencontrés');
  const inconnu = foret.entrees[2];
  assert.deepEqual(inconnu, { cle: 'traqueur', vu: false, gardien: false, nom: '???', modificateur: '', victoires: '', detail: 'Pas encore rencontré' });
  assert.ok(!JSON.stringify(ruines).includes('Araignée'));
});

test('panneau Carte : la section Bestiaire suit l’ouverture, sans annonce aria-live', () => {
  const bestiaire = { eclaireur: { vus: true, victoires: 2 } };
  return avec({ stockageV2: { ...BASE, bestiaire } }, jeu => {
    jeu.clic('carte');
    const zones = jeu.el('bestiairelist').children;
    assert.equal(zones.length, 3);
    assert.equal(zones[0].children[0].textContent, 'Forêt des Murmures · 1/4 rencontrés');
    const lignes = zones[0].children[1].children;
    assert.deepEqual(textes(lignes[0]), ['Éclaireur gobelin', '2 victoires']);
    assert.deepEqual(textes(lignes[1]), ['???', 'Pas encore rencontré']);
    assert.deepEqual(textes(lignes[3]), ['???', 'Gardien', 'Pas encore rencontré']);
    const alerte = jeu.el('alert').textContent;
    jeu.avancer(3_000);
    assert.equal(jeu.el('alert').textContent, alerte, 'aucune annonce supplémentaire');
  });
});
