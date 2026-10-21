import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_HP_MULT, BOSS_GOLD_MULT, RETALIATION_BASE, RETALIATION_BOSS_BASE, OFFLINE_CAP_SECONDS } from '../../dist/engine/balance.js';
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
  assert.equal(jeu.texte('gold'), (1100).toLocaleString('fr-FR'));
  assert.equal(jeu.stockage().gold, 1100);
}));

test('reprise : une partie braise-v1 avancée est migrée en braise-v2 au démarrage', () => avecJeu({ sauvegarde: AVANCEE }, jeu => {
  assert.equal(jeu.texte('gold'), (1100).toLocaleString('fr-FR'));
  assert.equal(jeu.stockage().version, 12);
  assert.equal(jeu.stockage().stage, 9);
}));

// Partie neuve : le harnais ne fournit rien en stockage.
test('premier parcours : bandeau, achat guidé, puis plus rien après rechargement', async () => {
  let ecrite;
  await avecJeu({}, jeu => {
    assert.equal(jeu.el('guidepanel').hidden, false, 'bandeau visible, combat non bloqué');
    jeu.avancer(1_200);
    assert.notEqual(jeu.texte('enemyhp'), '46 / 46', 'le combat continue derrière');
    assert.equal(jeu.el('buy-weapon').classList.contains('guided'), false);
    jeu.avancer(60_000);
    assert.equal(jeu.el('buy-weapon').classList.contains('guided'), true, 'amélioration la moins chère mise en évidence');
    assert.match(jeu.texte('buy-weapon'), /À acheter/, 'libellé, pas seulement une couleur');
    assert.equal(jeu.el('guidehint').hidden, false);
    jeu.clic('guideclose');
    assert.equal(jeu.el('guidepanel').hidden, true);
    jeu.clic('buy-weapon');
    assert.equal(jeu.el('buy-weapon').classList.contains('guided'), false);
    assert.equal(jeu.el('guidehint').hidden, true);
    assert.equal(jeu.stockage().guide, 'done');
    ecrite = jeu.stockage();
  });
  await avecJeu({ stockageV2: ecrite }, jeu => {
    assert.equal(jeu.el('guidepanel').hidden, true);
    jeu.avancer(600_000);
    assert.equal(jeu.el('buy-weapon').classList.contains('guided'), false);
    assert.equal(jeu.el('guidehint').hidden, true);
  });
});

test('pause : l’or n’avance pas, donc la mise en évidence n’apparaît pas', () => avecJeu({}, jeu => {
  jeu.clic('pause');
  jeu.avancer(600_000);
  assert.equal(jeu.el('buy-weapon').classList.contains('guided'), false);
}));

test('partie existante sans champ guide : aucun bandeau ni mise en évidence', () => avecJeu({ sauvegarde: { ...SAUVEGARDE, weapon: 1, gold: 500 } }, jeu => {
  assert.equal(jeu.el('guidepanel').hidden, true);
  assert.equal(jeu.el('buy-weapon').classList.contains('guided'), false);
  assert.equal(jeu.el('guidehint').hidden, true);
}));

const NEUVE_PUISSANTE = { ...SAUVEGARDE, level: 1, kills: 4 };

test('gardien : explication à la première apparition avec les chiffres de balance.js, une seule fois', async () => {
  let ecrite;
  await avecJeu({ stockageV2: { version: 2, ...NEUVE_PUISSANTE, guide: 'todo', vus: [] } }, jeu => {
    assert.equal(jeu.el('bossintro').hidden, true, 'pas avant les 5 victoires');
    jeu.avancer(60_000);
    assert.equal(jeu.el('bossintro').hidden, false);
    const txt = jeu.texte('bossintrotext');
    for (const n of [BOSS_HP_MULT, BOSS_GOLD_MULT, RETALIATION_BASE, RETALIATION_BOSS_BASE]) assert.ok(txt.includes(String(n)), `${n} dans « ${txt} »`);
    assert.match(txt, /butin/);
    assert.deepEqual(jeu.stockage().vus, ['gardien']);
    jeu.clic('bossintroclose');
    assert.equal(jeu.el('bossintro').hidden, true);
    ecrite = jeu.stockage();
  });
  await avecJeu({ stockageV2: { ...ecrite, kills: 5 } }, jeu => {
    assert.equal(jeu.el('bossintro').hidden, true, 'vue : rechargement sans explication');
    jeu.clic('boss');
    jeu.avancer(2_000);
    assert.equal(jeu.el('bossintro').hidden, true);
  });
});

test('gardien : un joueur existant ne voit aucune explication ponctuelle', () => avecJeu({ sauvegarde: { ...SAUVEGARDE, stage: 4, level: 3, kills: 5, gold: 50 } }, jeu => {
  jeu.avancer(5_000);
  assert.equal(jeu.el('bossintro').hidden, true);
  assert.equal(jeu.el('absenceintro').hidden, true);
}));

test('absence : message unique après le premier achat, ligne du plafond dans le panneau au retour', async () => {
  let ecrite;
  await avecJeu({ stockageV2: { version: 2, ...SAUVEGARDE, gold: 100, guide: 'todo', vus: ['gardien'] } }, jeu => {
    assert.equal(jeu.el('absenceintro').hidden, true);
    jeu.clic('buy-weapon');
    assert.equal(jeu.el('absenceintro').hidden, false);
    assert.ok(jeu.texte('absenceintrotext').includes(`${OFFLINE_CAP_SECONDS / 3600} h`));
    jeu.clic('absenceintroclose');
    jeu.clic('buy-weapon');
    assert.equal(jeu.el('absenceintro').hidden, true, 'un seul message');
    assert.deepEqual(jeu.stockage().vus, ['gardien', 'absence']);
    ecrite = jeu.stockage();
  });
  await avecJeu({ debut: 10_000_000, stockageV2: { ...ecrite, last: 10_000_000 - 3_600_000 } }, jeu => {
    assert.equal(jeu.el('absenceintro').hidden, true);
    assert.match(jeu.texte('offline'), /estimés/);
    assert.match(jeu.texte('offline'), new RegExp(`${OFFLINE_CAP_SECONDS / 3600} h`));
    const lignes = jeu.el('offlinelootlist').children.map(li => li.textContent);
    assert.equal(jeu.el('offlineloot').hidden, lignes.length === 0, 'objets listés un par <li>, bloc masqué sans objet');
    assert.ok(lignes.length > 0, '1 h d’absence rapporte au moins un objet');
  });
});

test('mouvement : le choix pilote l’attribut racine qui fige les animations CSS, sans recharger', () => avecJeu({ sauvegarde: SAUVEGARDE }, jeu => {
  assert.equal(jeu.racine.dataset.mouvement, 'systeme');
  const select = jeu.el('mouvement');
  select.onchange({ target: { value: 'reduit' } });
  assert.equal(jeu.racine.dataset.mouvement, 'reduit');
  select.onchange({ target: { value: 'complet' } });
  assert.equal(jeu.racine.dataset.mouvement, 'complet');
}));

test('texte : le choix pilote l’attribut racine, immédiatement', () => avecJeu({ sauvegarde: SAUVEGARDE }, jeu => {
  assert.equal(jeu.racine.dataset.texte, 'normal');
  jeu.el('texte').onchange({ target: { value: 'grand' } });
  assert.equal(jeu.racine.dataset.texte, 'grand');
  jeu.el('texte').onchange({ target: { value: 'normal' } });
  assert.equal(jeu.racine.dataset.texte, 'normal');
}));

test('partie illisible avec copie existante : le bouton télécharge le texte de cette session, l’ancien reste accessible', () => avecJeu({ stockageBrut: { 'braise-v2': '[texte actuel', 'braise-v2-secours': '{ancienne copie' } }, async jeu => {
  assert.equal(jeu.el('secours').hidden, false);
  assert.equal(jeu.el('secoursancien').hidden, false);
  jeu.clic('secours');
  jeu.clic('secoursancien');
  const [actuel, ancien] = await Promise.all(jeu.telechargements.map(d => d.blob.text()));
  assert.equal(actuel, '[texte actuel');
  assert.equal(ancien, '{ancienne copie');
  jeu.avancer(6_000);
  assert.equal(jeu.stockageBrut('braise-v2-secours'), '{ancienne copie', 'la copie existante n’est pas remplacée');
}));

test('partie illisible, première fois : un seul bouton, il télécharge le texte copié', () => avecJeu({ stockageBrut: { 'braise-v2': '{pas du json' } }, async jeu => {
  assert.equal(jeu.el('secoursancien').hidden, true);
  jeu.clic('secours');
  assert.equal(await jeu.telechargements[0].blob.text(), '{pas du json');
  assert.equal(jeu.stockageBrut('braise-v2-secours'), '{pas du json');
}));
