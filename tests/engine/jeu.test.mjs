import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';

const SAUVEGARDE = { gold: 0, xp: 0, level: 1, stage: 1, kills: 0, weapon: 0, armor: 0, luck: 0, last: 1_000_000 };

async function avecJeu(options, scenario) {
  const jeu = await lancerJeu(options);
  try { await scenario(jeu); } finally { jeu.fermer(); }
}

test('compétence : dégâts ×4 puis recharge de 15 s', () => avecJeu({ sauvegarde: SAUVEGARDE }, jeu => {
  assert.equal(jeu.texte('enemyhp'), '46 / 46');
  assert.equal(jeu.texte('cooldown'), 'Dégâts × 4 · prêt');
  jeu.clic('power');
  assert.equal(jeu.texte('enemyhp'), '14 / 46', '8 × 4 = 32 dégâts');
  assert.equal(jeu.texte('cooldown'), 'Recharge · 15 s');
  assert.equal(jeu.el('power').disabled, true);
  jeu.avancer(14_000);
  assert.equal(jeu.texte('cooldown'), 'Recharge · 1 s');
  jeu.avancer(1_000);
  assert.equal(jeu.texte('cooldown'), 'Dégâts × 4 · prêt');
  assert.equal(jeu.el('power').disabled, false);
}));

test('pause : ni combat, ni recharge, ni compétence', () => avecJeu({ sauvegarde: SAUVEGARDE }, jeu => {
  jeu.clic('power');
  jeu.clic('pause');
  const avant = { ennemi: jeu.texte('enemyhp'), or: jeu.texte('gold'), recharge: jeu.texte('cooldown') };
  jeu.avancer(60_000);
  assert.deepEqual({ ennemi: jeu.texte('enemyhp'), or: jeu.texte('gold'), recharge: jeu.texte('cooldown') }, avant);
  jeu.clic('power');
  assert.equal(jeu.texte('enemyhp'), avant.ennemi, 'la compétence est ignorée en pause');
  assert.equal(jeu.evenements.at(-1).detail, true);
  jeu.clic('pause');
  jeu.avancer(1_200);
  assert.notEqual(jeu.texte('enemyhp'), avant.ennemi, 'le combat reprend');
}));

test('combat automatique : un coup toutes les 1,2 s, sans dépendre du framerate', () => avecJeu({ sauvegarde: SAUVEGARDE }, jeu => {
  jeu.avancer(1_199);
  assert.equal(jeu.texte('enemyhp'), '46 / 46');
  jeu.avancer(1);
  assert.equal(jeu.texte('enemyhp'), '38 / 46');
}));

test('achat via l’interface : coût déduit une fois, sauvegarde horodatée par l’horloge simulée', () =>
  avecJeu({ sauvegarde: { ...SAUVEGARDE, gold: 100 } }, jeu => {
    jeu.clic('buy-weapon');
    assert.equal(jeu.texte('gold'), '76');
    assert.equal(String(jeu.texte('attack')), '12');
    assert.equal(jeu.stockage().weapon, 1);
    assert.equal(jeu.stockage().gold, 76);
    jeu.avancer(5_000);
    assert.equal(jeu.stockage().last, 1_005_000);
  }));

test('fonds insuffisants via l’interface : rien ne change', () => avecJeu({ sauvegarde: { ...SAUVEGARDE, gold: 23 } }, jeu => {
  jeu.clic('buy-weapon');
  assert.equal(jeu.texte('gold'), '23');
  assert.equal(String(jeu.texte('attack')), '8');
}));

const fichier = texte => ({ target: { files: [{ text: async () => texte }], value: 'x' } });
const AVANCEE = { gold: 900, xp: 3, level: 5, stage: 9, kills: 1, weapon: 2, armor: 1, luck: 1, last: 1_000_000 };

test('import : refusé à la confirmation, la partie en cours reste intacte', () => avecJeu({ sauvegarde: SAUVEGARDE }, async jeu => {
  const confirmer = globalThis.confirm;
  globalThis.confirm = () => false;
  try { await jeu.el('importfile').onchange(fichier(JSON.stringify({ version: 2, ...AVANCEE }))); } finally { globalThis.confirm = confirmer; }
  assert.equal(jeu.texte('gold'), '0');
  assert.equal(jeu.texte('message'), 'Import annulé.');
}));

test('import : fichier invalide signalé sans rien changer ; fichier valide confirmé remplace la partie', () => avecJeu({ sauvegarde: SAUVEGARDE }, async jeu => {
  await jeu.el('importfile').onchange(fichier('{oups'));
  assert.match(jeu.texte('message'), /Import refusé/);
  assert.equal(jeu.texte('gold'), '0');
  await jeu.el('importfile').onchange(fichier(JSON.stringify({ version: 2, ...AVANCEE })));
  assert.equal(jeu.texte('gold'), '900');
  assert.equal(jeu.stockage().gold, 900);
}));

test('reprise : une partie braise-v1 avancée est migrée en braise-v2 au démarrage', () => avecJeu({ sauvegarde: AVANCEE }, jeu => {
  assert.equal(jeu.texte('gold'), '900');
  assert.equal(jeu.stockage().version, 2);
  assert.equal(jeu.stockage().stage, 9);
}));
