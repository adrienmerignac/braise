import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';

const BASE = { gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1_000_000 };
const avec = async (options, scenario) => { const jeu = await lancerJeu(options); try { await scenario(jeu); } finally { jeu.fermer(); } };

test('partie neuve : aucun récit pendant le guide, « braise » après le premier achat et l’explication d’absence', () => avec({}, jeu => {
  jeu.avancer(3_000);
  assert.equal(jeu.el('recit').hidden, true, 'guide en cours');
}));

test('« braise » jamais par-dessus l’encart d’absence, affiché une fois celui-ci fermé', () => {
  const stockageV2 = { version: 7, ...BASE, gold: 500, guide: 'todo', vus: [] };
  return avec({ stockageV2 }, jeu => {
    jeu.clic('buy-weapon');
    assert.equal(jeu.el('absenceintro').hidden, false);
    jeu.avancer(1_000);
    assert.equal(jeu.el('recit').hidden, true);
    jeu.clic('absenceintroclose');
    jeu.avancer(1_000);
    assert.equal(jeu.el('recit').hidden, false);
    assert.equal(jeu.texte('recittitre'), 'La braise du camp');
  });
});

test('fermer le récit le marque lu et sauvegarde ; recharger sans fermer le montre encore', () => {
  const stockageV2 = { version: 7, ...BASE, guide: 'done', vus: ['gardien', 'absence'] };
  return avec({ stockageV2 }, jeu => {
    jeu.avancer(1_000);
    assert.equal(jeu.el('recit').hidden, false);
    jeu.focus('recitclose');
    jeu.clic('recitclose');
    assert.equal(jeu.el('recit').hidden, true);
    assert.deepEqual(jeu.stockage().recitsLus, ['braise']);
  });
});

test('récit débloqué par le gardien : annoncé une fois, combats non bloqués', () => {
  const stockageV2 = { version: 7, ...BASE, stage: 5, meilleurEtage: 5, kills: 5, weapon: 20, level: 20, guide: 'done', vus: ['gardien', 'absence'], recitsLus: ['braise'] };
  return avec({ stockageV2 }, jeu => {
    jeu.clic('boss');
    for (let i = 0; i < 10 && jeu.el('recit').hidden; i++) jeu.avancer(1_000);
    assert.equal(jeu.el('recit').hidden, false);
    assert.equal(jeu.texte('recittitre'), 'Une route sous les eaux');
    const alerte = jeu.texte('alert');
    jeu.avancer(3_000);
    assert.ok(jeu.texte('alert') === alerte || !jeu.texte('alert').includes('Une route'), 'pas de répétition à chaque tick');
    assert.ok(jeu.texte('stage') !== '', 'le jeu continue');
    jeu.clic('recitclose');
    assert.deepEqual(jeu.stockage().recitsLus, ['braise', 'ruines']);
  });
});
