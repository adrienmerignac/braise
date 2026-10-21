// Recette M7.1 : une nouvelle partie jouée par l'interface, de la première minute à l'ouverture des ruines.
// Horloge virtuelle (aucun timer réel) ; Math.random est fixé pour que butin et critiques soient reproductibles.
// Durée simulée : environ 3 minutes de jeu avec la politique « patient » de tools/simulate.mjs, donc aucune sauvegarde intermédiaire.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lancerJeu } from './horloge.mjs';
import { cost } from '../../dist/engine/state.js';
import { assessGuardian } from '../../dist/engine/combat.js';
import { zoneOuverte, ZONES } from '../../dist/engine/zones.js';
import { pointsLibres } from '../../dist/engine/talents.js';
import { ATTACK_INTERVAL_MS, KILLS_PER_STAGE } from '../../dist/engine/balance.js';

const PAS = ATTACK_INTERVAL_MS;
const BORNE_PAS = 5_000; // garde-fou : ~100 min de jeu simulé, très au-delà du parcours (~3 min)
const nombre = texte => Number(texte.replace(/\D/g, ''));

// Le jeu n'écrit que sur action ou toutes les 5 s : on fige la partie (pause) le temps d'une écriture périodique pour relire
// une copie à jour de ce que l'écran affiche. La pause ne consomme aucun coup : le déroulé du combat n'est pas modifié.
function relire(jeu) {
  jeu.clic('pause');
  jeu.avancer(5_000);
  jeu.clic('pause');
  return jeu.stockage();
}

// Sauvegarde relue : valide et cohérente avec l'affichage (or, niveau, étage, zone).
function verifierSauvegarde(jeu, etape) {
  const sv = relire(jeu);
  assert.equal(sv.version, 11, `${etape} : version`);
  assert.equal(jeu.texte('gold'), Math.floor(sv.gold).toLocaleString('fr-FR'), `${etape} : or affiché = or sauvegardé`);
  assert.equal(String(jeu.texte('level')), String(sv.level), `${etape} : niveau`);
  assert.equal(jeu.texte('stage'), String(sv.stage).padStart(2, '0'), `${etape} : étage`);
  assert.ok(jeu.texte('floor').startsWith(`${ZONES[sv.zone].nom} · Étage ${sv.stage}`), `${etape} : zone et étage du bandeau`);
  for (const k of ['gold', 'xp', 'level', 'stage', 'kills', 'weapon', 'armor', 'luck']) assert.ok(Number.isFinite(sv[k]) && sv[k] >= 0, `${etape} : ${k}`);
  assert.ok(sv.meilleurEtage >= sv.stage, `${etape} : meilleur étage`);
  assert.ok(Array.isArray(sv.inventaire) && typeof sv.equipe === 'object', `${etape} : inventaire`);
  return sv;
}

// Joue coup par coup (un seul `avancer(PAS)` par tour) jusqu'à ce que `fini()` soit vrai. Le joueur achète l'amélioration
// abordable et ne lance le gardien que s'il n'est pas « Mortel » (politique `farm` de tools/simulate.mjs).
function jouer(jeu, fini) {
  for (let i = 0; i < BORNE_PAS; i++) {
    if (fini()) return;
    for (const k of ['weapon', 'armor', 'luck']) if (!jeu.el('buy-' + k).disabled) jeu.clic('buy-' + k);
    const sv = relire(jeu);
    if (sv.kills >= KILLS_PER_STAGE && !jeu.texte('floor').includes('Gardien') && assessGuardian(sv).danger !== 'Mortel') jeu.clic('boss');
    jeu.avancer(PAS);
  }
  assert.fail('objectif non atteint dans la borne de temps simulé');
}

test('nouvelle partie : de la première minute à l’ouverture des ruines', async () => {
  const random = Math.random;
  Math.random = () => 0.5;
  const jeu = await lancerJeu();
  try {
    // 1. Tutoriel court, combat non bloqué, premier achat guidé.
    assert.equal(jeu.el('guidepanel').hidden, false, 'tutoriel affiché');
    jeu.avancer(PAS);
    assert.notEqual(jeu.texte('enemyhp'), '46 / 46', 'le combat tourne derrière le tutoriel');
    jeu.avancer(5_000);
    assert.equal(verifierSauvegarde(jeu, 'première minute').guide, 'todo');
    for (let i = 0; i < 60 && !jeu.el('buy-weapon').classList.contains('guided'); i++) jeu.avancer(PAS);
    assert.equal(jeu.el('buy-weapon').classList.contains('guided'), true, 'premier achat guidé mis en évidence');
    jeu.clic('guideclose');
    assert.equal(jeu.el('guidepanel').hidden, true, 'le tutoriel se ferme');
    const orAvant = nombre(jeu.texte('gold'));
    jeu.clic('buy-weapon');
    const achat = verifierSauvegarde(jeu, 'premier achat');
    assert.equal(achat.weapon, 1);
    assert.equal(achat.guide, 'done');
    assert.equal(orAvant - nombre(jeu.texte('gold')), cost({ weapon: 0, armor: 0, luck: 0 }, 'weapon'), 'coût débité une seule fois');

    // Le message d'absence suit le premier achat ; le récit de départ attend que plus aucun encart ne soit ouvert.
    assert.equal(jeu.el('absenceintro').hidden, false, 'message d’absence après le premier achat');
    assert.equal(jeu.el('recit').hidden, true, 'récit retenu tant qu’un encart est ouvert');
    jeu.clic('absenceintroclose');
    jeu.avancer(PAS);
    assert.equal(jeu.el('recit').hidden, false);
    assert.equal(jeu.texte('recittitre'), 'La braise du camp');
    jeu.clic('recitclose');
    assert.equal(jeu.el('recit').hidden, true);

    // 2. Rythme fixe et pause.
    // Le coup tombe toutes les 1,2 s exactement, quelle que soit la phase d'arrivée : on se cale sur un coup, puis on mesure l'intervalle.
    let pv = jeu.texte('enemyhp');
    for (let i = 0; i < 12 && jeu.texte('enemyhp') === pv; i++) jeu.avancer(100);
    pv = jeu.texte('enemyhp');
    jeu.avancer(PAS - 100);
    assert.equal(jeu.texte('enemyhp'), pv, 'aucun coup avant l’intervalle');
    jeu.avancer(100);
    assert.notEqual(jeu.texte('enemyhp'), pv, 'un coup à l’intervalle exact');
    jeu.clic('pause');
    const fige = { ennemi: jeu.texte('enemyhp'), or: jeu.texte('gold'), kills: jeu.stockage().kills };
    jeu.avancer(120_000);
    assert.deepEqual({ ennemi: jeu.texte('enemyhp'), or: jeu.texte('gold'), kills: jeu.stockage().kills }, fige, 'la pause fige tout');
    jeu.clic('pause');
    jeu.avancer(PAS);
    verifierSauvegarde(jeu, 'reprise après pause');

    // 3. Premier gardien : expliqué à la cinquième victoire, puis combattu.
    jouer(jeu, () => !jeu.el('bossintro').hidden);
    assert.equal(relire(jeu).kills, KILLS_PER_STAGE);
    assert.match(jeu.texte('bossintrotext'), /gardien/i);
    assert.ok(jeu.stockage().vus.includes('gardien'));
    jeu.clic('bossintroclose');
    assert.equal(jeu.el('bossintro').hidden, true);
    verifierSauvegarde(jeu, 'gardien expliqué');
    jouer(jeu, () => jeu.texte('floor').includes('Gardien'));
    jouer(jeu, () => !jeu.el('bosspanel').hidden);
    assert.equal(jeu.texte('bosstitle'), 'Gardien vaincu');
    assert.equal(jeu.texte('stage'), '02', 'étage suivant ouvert');
    // Le panneau de victoire reste ouvert mais les combats suivants se poursuivent.
    const ennemi = jeu.texte('enemyhp');
    jeu.avancer(PAS);
    assert.notEqual(jeu.texte('enemyhp'), ennemi, 'le combat continue derrière le panneau de victoire');
    jeu.clic('bossclose');
    assert.equal(jeu.el('bosspanel').hidden, true);
    verifierSauvegarde(jeu, 'gardien vaincu');

    // 4. Un objet est obtenu, équipé depuis l'inventaire ; un point de talent est investi.
    jouer(jeu, () => !jeu.el('inventairecompte').textContent.startsWith('0 /'));
    const objet = relire(jeu).inventaire[0];
    jeu.clic('inventaire');
    assert.equal(jeu.el('inventairepanel').hidden, false);
    const lignes = jeu.el('inventairelist').children;
    assert.equal(lignes.length, 3 + jeu.stockage().inventaire.length, 'trois emplacements puis les objets rangés');
    lignes[3].onclick();
    jeu.clic('equiper');
    const equipe = verifierSauvegarde(jeu, 'objet équipé');
    assert.equal(equipe.equipe[objet.emplacement]?.id ?? equipe.equipe[objet.emplacement]?.nom, objet.id ?? objet.nom, 'objet en place');
    assert.equal(equipe.inventaire.length, 0, 'sorti du rangement');
    jeu.focus('inventaireclose');
    jeu.clic('inventaireclose');
    assert.equal(jeu.el('inventairepanel').hidden, true);
    assert.equal(jeu.actif(), jeu.el('inventaire'), 'focus rendu au bouton qui a ouvert le panneau');

    jouer(jeu, () => jeu.texte('talentscompte') !== '');
    assert.match(jeu.texte('talentscompte'), /1 point libre/);
    jeu.clic('talents');
    jeu.clic('talent-invest-assaut');
    const talents = verifierSauvegarde(jeu, 'talent investi');
    assert.equal(talents.talents.assaut, 1);
    assert.equal(pointsLibres(talents), 0);
    jeu.focus('talent-invest-assaut');
    jeu.clic('talentsclose');
    assert.equal(jeu.el('talentspanel').hidden, true);
    assert.equal(jeu.actif(), jeu.el('talents'), 'focus rendu au bouton qui a ouvert le panneau');

    // 5. Les ruines s'ouvrent sur la victoire du gardien de l'étage 5 : voyage, récit non bloquant, retour en forêt.
    assert.equal(zoneOuverte(relire(jeu), 'ruines'), false);
    jeu.clic('carte');
    assert.equal(jeu.el('zone-voyage-ruines').hidden, true, 'ruines fermées : pas de bouton');
    assert.match(jeu.texte('zone-etat-ruines'), /Fermée · Vaincre le gardien de l’étage 5/);
    jeu.clic('carteclose');
    jouer(jeu, () => !jeu.el('recit').hidden && jeu.texte('recittitre') === 'Une route sous les eaux');
    assert.equal(zoneOuverte(relire(jeu), 'ruines'), true, 'condition d’accès remplie (gardien de l’étage 5 vaincu)');
    assert.equal(jeu.texte('stage'), '05', 'le héros reste au dernier étage de la forêt');
    assert.equal(jeu.el('recit').hidden, false, 'fragment de récit annoncé');
    assert.equal(jeu.texte('recittitre'), 'Une route sous les eaux');
    const avantRecit = jeu.texte('enemyhp');
    jeu.avancer(PAS);
    assert.notEqual(jeu.texte('enemyhp'), avantRecit, 'le récit ne bloque pas le combat');
    jeu.clic('recitclose');
    assert.equal(jeu.el('recit').hidden, true);
    assert.ok(relire(jeu).recitsLus.includes('ruines'));
    verifierSauvegarde(jeu, 'ruines ouvertes');

    jeu.clic('carte');
    assert.match(jeu.texte('zone-etat-ruines'), /Ouverte/);
    assert.equal(jeu.actif(), jeu.el('zone-voyage-ruines'), 'focus sur le voyage possible');
    jeu.clic('zone-voyage-ruines');
    assert.equal(jeu.texte('floor'), 'Ruines englouties · Étage 6');
    assert.equal(verifierSauvegarde(jeu, 'voyage vers les ruines').zone, 'ruines');
    jeu.avancer(PAS);
    jeu.clic('carte');
    assert.equal(jeu.el('zone-voyage-foret').hidden, false, 'retour en forêt possible');
    jeu.clic('zone-voyage-foret');
    assert.match(jeu.texte('floor'), /^Forêt des Murmures · Étage 5/);
    assert.equal(verifierSauvegarde(jeu, 'retour en forêt').zone, 'foret');
  } finally { jeu.fermer(); Math.random = random; }
});
