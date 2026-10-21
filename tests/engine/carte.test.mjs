import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { fresh } from '../../dist/engine/state.js';
import { decrireCarte, messageVoyage } from '../../dist/engine/carte.js';

const partie = extra => ({ ...fresh(1_000_000), ...extra });
const ligne = (l, id) => l.find(x => x.id === id);

test('partie neuve : forêt ici, ruines et cryptes fermées avec leur condition', () => {
  const l = decrireCarte(partie(), { boss: false });
  assert.deepEqual(l.map(x => x.id), ['foret', 'ruines', 'cryptes']);
  assert.equal(ligne(l, 'foret').etat, 'Vous êtes ici');
  assert.equal(ligne(l, 'foret').plage, 'Étages 1 à 5');
  assert.equal(ligne(l, 'ruines').etat, 'Fermée · Vaincre le gardien de l’étage 5');
  assert.equal(ligne(l, 'cryptes').etat, 'Fermée · Vaincre le gardien de l’étage 10');
  assert.equal(ligne(l, 'cryptes').plage, 'Étages 11 et au-delà');
  assert.deepEqual(l.map(x => x.action), [null, null, null]);
});

test('après l’ouverture des ruines : voyage possible, étage d’arrivée écrit', () => {
  const l = decrireCarte(partie({ stage: 5, meilleurEtage: 6 }), { boss: false });
  assert.equal(ligne(l, 'ruines').etat, 'Ouverte · étage 6 en arrivant');
  assert.equal(ligne(l, 'ruines').action, 'voyager');
  assert.equal(ligne(l, 'ruines').confirmation, null);
  assert.equal(ligne(l, 'foret').action, null, 'la zone courante n’a pas de bouton');
  assert.equal(ligne(l, 'cryptes').action, null);
});

test('gardien en cours : le voyage demande une confirmation', () => {
  const l = decrireCarte(partie({ stage: 5, meilleurEtage: 6 }), { boss: true });
  assert.equal(ligne(l, 'ruines').confirmation, 'Le combat contre le gardien sera abandonné.');
});

test('message de voyage', () => {
  assert.equal(messageVoyage('ruines', 'Ruines englouties', 6), 'Vous voyagez vers les Ruines englouties (étage 6).');
});

const V5 = (extra = {}) => ({ stockageV2: { version: 5, gold: 0, xp: 0, level: 1, stage: 5, zone: 'foret', meilleurEtage: 6, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1_000_000, guide: 'done', vus: ['gardien', 'absence'], inventaire: [], equipe: {}, talents: {}, ...extra } });
async function avecJeu(options, scenario) {
  const jeu = await lancerJeu(options);
  try { await scenario(jeu); } finally { jeu.fermer(); }
}

test('interface : le bandeau nomme la zone, Voyager change de zone, journal et focus', () => avecJeu(V5(), jeu => {
  assert.equal(jeu.texte('floor'), 'Forêt des Murmures · Étage 5');
  jeu.clic('carte');
  assert.equal(jeu.el('cartepanel').hidden, false);
  assert.equal(jeu.texte('zone-etat-ruines'), '○ Ouverte · étage 6 en arrivant');
  assert.equal(jeu.el('zone-voyage-foret').hidden, true);
  assert.equal(jeu.actif(), jeu.el('zone-voyage-ruines'));
  jeu.clic('zone-voyage-ruines');
  assert.equal(jeu.el('voyageconfirm').open, false, 'sans gardien : pas de confirmation');
  assert.equal(jeu.el('cartepanel').hidden, true);
  assert.equal(jeu.texte('message'), 'Vous voyagez vers les Ruines englouties (étage 6).');
  assert.equal(jeu.texte('floor'), 'Ruines englouties · Étage 6');
  assert.equal(jeu.actif(), jeu.el('carte'));
  assert.equal(jeu.stockage().zone, 'ruines');
}));

test('interface : gardien en cours, confirmation puis abandon ; annuler ne change rien', () => avecJeu(V5({ kills: 5 }), jeu => {
  jeu.clic('boss');
  jeu.clic('carte');
  jeu.clic('zone-voyage-ruines');
  assert.equal(jeu.el('voyageconfirm').open, true);
  assert.match(jeu.texte('voyageconfirmtexte'), /Le combat contre le gardien sera abandonné/);
  jeu.clic('voyageconfirmnon');
  assert.equal(jeu.texte('floor'), 'Forêt des Murmures · Étage 5 · Gardien');
  jeu.clic('zone-voyage-ruines');
  jeu.clic('voyageconfirmok');
  assert.equal(jeu.texte('floor'), 'Ruines englouties · Étage 6');
}));

test('interface : voyage en pause, le jeu reste en pause', () => avecJeu(V5(), jeu => {
  jeu.clic('pause');
  jeu.clic('carte');
  jeu.clic('zone-voyage-ruines');
  assert.equal(jeu.texte('pause'), '▶ Reprendre');
  assert.equal(jeu.texte('floor'), 'Ruines englouties · Étage 6');
}));

test('interface : « nouveau » après l’ouverture d’une zone, effacé à l’ouverture du panneau', () => avecJeu(V5({ meilleurEtage: 5, kills: 5, weapon: 20, level: 20 }), jeu => {
  assert.equal(jeu.texte('cartenouveau'), '');
  jeu.clic('boss');
  for (let i = 0; i < 10 && jeu.el('bosspanel').hidden; i++) jeu.avancer(1_000);
  assert.equal(jeu.el('bosspanel').hidden, false, 'panneau du gardien non bloquant');
  assert.equal(jeu.texte('cartenouveau'), '● nouveau');
  jeu.clic('carte');
  assert.equal(jeu.texte('cartenouveau'), '');
}));

test('chaque zone, fermée comprise, annonce son butin en texte', () => {
  const l = decrireCarte(partie(), { boss: false });
  assert.deepEqual(l.map(x => x.butin), ['Butin : armes plus fréquentes', 'Butin : armures plus fréquentes', 'Butin : charmes plus fréquents']);
});
