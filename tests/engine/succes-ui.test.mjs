import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { decrireSucces } from '../../dist/engine/carte.js';
import { annoncePour } from '../../dist/engine/annonces.js';

const BASE = { version: 11, gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1_000_000, guide: 'done', vus: ['gardien', 'absence'], recitsLus: ['braise', 'ruines', 'cryptes', 'cendres'], succes: ['recits'] };
const avec = async (options, scenario) => { const jeu = await lancerJeu(options); try { await scenario(jeu); } finally { jeu.fermer(); } };
const textes = li => li.children.map(c => c.textContent);

test('liste : compteur, libellés, états écrits et progrès chiffré', () => {
  const d = decrireSucces({ succes: ['etage25'], meilleurEtage: 30, bestiaire: {}, objectifs: {}, equipe: {} });
  assert.equal(d.compteur, '1 / 9 succès');
  assert.equal(d.lignes.length, 9);
  assert.deepEqual(d.lignes[0], { id: 'etage25', libelle: 'Atteindre l’étage 25', obtenu: true, etat: 'Obtenu', progres: '25 / 25' });
  assert.deepEqual(d.lignes[1], { id: 'etage50', libelle: 'Atteindre l’étage 50', obtenu: false, etat: 'À obtenir', progres: '30 / 50' });
  assert.equal(d.lignes.find(l => l.id === 'epique').progres, '', 'cible 1 : pas de progrès chiffré');
});

test('annonce d’un succès : une phrase pour les lecteurs d’écran', () => {
  assert.equal(annoncePour({ type: 'succes', libelle: 'Équiper un objet épique' }), 'Succès obtenu : Équiper un objet épique.');
});

test('panneau Carte : section Succès rendue, sans annonce aria-live', () => avec({ stockageV2: { ...BASE, meilleurEtage: 30, succes: ['recits', 'etage25'] } }, jeu => {
  jeu.clic('carte');
  assert.equal(jeu.texte('succescompteur'), '2 / 9 succès');
  const lignes = jeu.el('succeslist').children;
  assert.equal(lignes.length, 9);
  assert.deepEqual(textes(lignes[0]), ['Atteindre l’étage 25', 'Obtenu', '25 / 25']);
  assert.deepEqual(textes(lignes[1]), ['Atteindre l’étage 50', 'À obtenir', '30 / 50']);
  const alerte = jeu.el('alert').textContent;
  jeu.avancer(3_000);
  assert.equal(jeu.el('alert').textContent, alerte);
}));

test('rechargement : un succès déjà obtenu n’est ni annoncé ni affiché', () => avec({ stockageV2: { ...BASE, meilleurEtage: 30, succes: ['recits', 'etage25'] } }, jeu => {
  jeu.avancer(3_000);
  assert.equal(jeu.el('succes').hidden, true);
  assert.ok(!jeu.el('alert').textContent.includes('Succès'));
}));

test('succès obtenu pendant le guide : l’encart attend la fin du guide', () => {
  const stockageV2 = { ...BASE, guide: 'todo', vus: [], gold: 500, meilleurEtage: 30, stage: 30 };
  return avec({ stockageV2 }, jeu => {
    jeu.clic('buy-weapon');
    jeu.avancer(2_000);
    assert.equal(jeu.el('succes').hidden, true, 'guide en cours');
    assert.equal(jeu.el('absenceintro').hidden, false);
    jeu.clic('guideclose');
    jeu.avancer(1_000);
    assert.equal(jeu.el('succes').hidden, true, 'encart d’absence encore ouvert');
    jeu.clic('absenceintroclose');
    jeu.avancer(1_000);
    assert.equal(jeu.el('succes').hidden, false);
    assert.equal(jeu.texte('succestexte'), 'Atteindre l’étage 25');
  });
});

test('deux succès simultanés : un encart à la fois, une annonce chacun, journal conservé', () => {
  const stockageV2 = { ...BASE, meilleurEtage: 100, stage: 100, gold: 0 };
  return avec({ stockageV2 }, jeu => {
    jeu.avancer(1_000);
    for (let i = 0; i < 30 && jeu.el('succes').hidden; i++) jeu.avancer(1_000);
    assert.equal(jeu.el('succes').hidden, false);
    assert.equal(jeu.texte('succestexte'), 'Atteindre l’étage 25');
    assert.equal(jeu.el('alert').textContent, 'Succès obtenu : Atteindre l’étage 25.');
    assert.ok(jeu.texte('message').includes('Succès obtenu'));
    jeu.avancer(3_000);
    assert.equal(jeu.texte('succestexte'), 'Atteindre l’étage 25', 'pas de second encart par-dessus');
    jeu.focus('succesclose');
    jeu.clic('succesclose');
    assert.equal(jeu.el('succes').hidden, false, 'le suivant s’enchaîne');
    assert.equal(jeu.texte('succestexte'), 'Atteindre l’étage 50');
    assert.equal(jeu.el('alert').textContent, 'Succès obtenu : Atteindre l’étage 50.');
    jeu.clic('succesclose');
    assert.equal(jeu.texte('succestexte'), 'Atteindre l’étage 100');
    jeu.clic('succesclose');
    assert.equal(jeu.el('succes').hidden, true);
  });
});

test('un récit ouvert passe avant : l’encart de succès attend sa fermeture', () => avec({ stockageV2: { ...BASE, recitsLus: ['braise'], meilleurEtage: 100, stage: 100 } }, jeu => {
  jeu.avancer(2_000);
  assert.equal(jeu.el('recit').hidden, false);
  assert.equal(jeu.el('succes').hidden, true);
  jeu.clic('recitclose');
  for (let i = 0; i < 6 && jeu.el('succes').hidden; i++) jeu.avancer(1_000);
  assert.equal(jeu.el('recit').hidden, false, 'le récit suivant passe encore avant');
  for (let i = 0; i < 4; i++) { jeu.clic('recitclose'); jeu.avancer(1_000); }
  assert.equal(jeu.el('recit').hidden, true);
  assert.equal(jeu.el('succes').hidden, false);
}));
