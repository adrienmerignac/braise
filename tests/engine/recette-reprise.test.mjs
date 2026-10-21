// Recette de référence (M7.1) : deux parcours rejoués de bout en bout dans l'interface (dist/game.js piloté par l'horloge virtuelle).
import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFLINE_CAP_SECONDS } from '../../dist/engine/balance.js';
import { creerObjet } from '../../dist/engine/equipement.js';
import { zoneOuverte } from '../../dist/engine/zones.js';
import { lancerJeu } from './horloge.mjs';

const T0 = 1_000_000, HEURE = 3_600_000;
const AVANCEE = { gold: 900, xp: 3, level: 5, stage: 9, kills: 1, weapon: 2, armor: 1, luck: 1, last: T0 };
const fichier = texte => ({ target: { files: [{ text: async () => texte }], value: 'x' } });
const fmt = n => n.toLocaleString('fr-FR');

async function avecJeu(options, scenario) {
  const jeu = await lancerJeu(options);
  try { return await scenario(jeu); } finally { jeu.fermer(); }
}

test('recette 1 : partie braise-v1 avancée migrée, panneaux, export puis import', () => avecJeu({ sauvegarde: AVANCEE }, async jeu => {
  const ecrite = jeu.stockage();
  assert.equal(ecrite.version, 7);
  assert.equal(jeu.stockageBrut('braise-v1') !== undefined, true, 'l’ancienne clé n’est pas supprimée');
  assert.deepEqual([ecrite.stage, ecrite.level, ecrite.weapon, ecrite.armor, ecrite.luck], [9, 5, 2, 1, 1]);
  assert.equal(jeu.texte('gold'), fmt(ecrite.gold));
  assert.equal(ecrite.gold, 1100, '900 + or du gardien de la forêt déjà dépassé');
  assert.equal(String(jeu.texte('level')), '5');
  assert.deepEqual(ecrite.inventaire, []);
  assert.deepEqual(ecrite.equipe, {});
  assert.deepEqual(ecrite.talents, {});
  assert.equal(ecrite.meilleurEtage, 9);
  assert.ok(ecrite.objectifs && ecrite.objectifs.foret, 'objectifs par défaut');
  assert.ok(Array.isArray(ecrite.recitsLus), 'récits par défaut');
  assert.equal(ecrite.zone, 'ruines', 'la migration place le joueur dans la zone de son étage (9)');
  assert.equal(zoneOuverte(ecrite, 'foret'), true);
  assert.equal(zoneOuverte(ecrite, 'ruines'), true, 'étage 9 ≥ 6');
  assert.equal(zoneOuverte(ecrite, 'cryptes'), false);

  for (const [ouvrir, panneau, fermer] of [['inventaire', 'inventairepanel', 'inventaireclose'], ['talents', 'talentspanel', 'talentsclose'], ['carte', 'cartepanel', 'carteclose']]) {
    jeu.clic(ouvrir);
    assert.equal(jeu.el(panneau).hidden, false, `${ouvrir} ouvert`);
    jeu.clic(fermer);
    assert.equal(jeu.el(panneau).hidden, true, `${ouvrir} fermé`);
  }

  jeu.avancer(5_000);
  const avant = jeu.stockage();
  jeu.clic('export');
  const exporte = await jeu.telechargements.at(-1).blob.text();
  await jeu.el('importfile').onchange(fichier(exporte));
  const apres = jeu.stockage();
  const sansHorloge = ({ last, ...reste }) => reste;
  assert.deepEqual(sansHorloge(apres), sansHorloge(avant), 'même partie après l’aller-retour');
  assert.equal(jeu.texte('gold'), fmt(avant.gold));
}));

// Partie v7 en cours : zone, talents, objet équipé.
async function partieEnCours() {
  const arme = creerObjet('arme', 'rare', 3);
  return avecJeu({ stockageV2: { version: 7, gold: 50, xp: 0, level: 8, stage: 7, zone: 'ruines', meilleurEtage: 7, kills: 0, weapon: 3, armor: 2, luck: 1,
    last: T0, guide: 'done', vus: ['gardien', 'absence'], inventaire: [], equipe: { arme }, talents: { assaut: 1 },
    objectifs: { foret: { chasse: 0, faits: [] }, ruines: { chasse: 0, faits: [] }, cryptes: { chasse: 0, faits: [] } }, recitsLus: [] } }, jeu => {
    jeu.clic('pause'); jeu.clic('pause');
    return { ecrite: jeu.stockage(), arme };
  });
}

const relancer = (ecrite, debut) => ({ debut, stockageBrut: { 'braise-v2': JSON.stringify({ ...ecrite, last: T0 }) } });

test('recette 2 : retour après 8 h et 30 h — mêmes gains, rien de recrédité, partie conservée', async () => {
  const { ecrite, arme } = await partieEnCours();
  assert.equal(ecrite.version, 7);
  const retours = [];
  for (const heures of [8, 30]) {
    await avecJeu(relancer(ecrite, T0 + heures * HEURE), async jeu => {
      assert.match(jeu.texte('offline'), /Pendant ton absence/);
      assert.match(jeu.texte('offline'), new RegExp(`${OFFLINE_CAP_SECONDS / 3600} h`));
      const panneau = jeu.texte('offline');
      jeu.clic('claim');
      jeu.avancer(5_000); // la sauvegarde périodique écrit l'état après collecte
      const s = jeu.stockage();
      assert.deepEqual(s.equipe, { arme }, 'équipement conservé');
      assert.deepEqual(s.talents, { assaut: 1 });
      assert.equal(s.zone, 'ruines');
      assert.ok(s.gold > ecrite.gold, 'gains crédités');
      retours.push({ panneau, gold: s.gold, level: s.level }); // le butin est tiré au hasard : seuls l’or et le niveau sont comparés
      const apresCollecte = s;
      // Second lancement immédiat avec le même stockage : rien de recrédité.
      const brut = { 'braise-v2': jeu.stockageBrut('braise-v2') };
      await avecJeu({ debut: T0 + heures * HEURE + 5_000, stockageBrut: brut }, jeu2 => {
        assert.equal(jeu2.stockage().gold, apresCollecte.gold, 'pas de double collecte');
        assert.equal(jeu2.stockage().inventaire.length, apresCollecte.inventaire.length);
        assert.equal(jeu2.el('offline').textContent, '', 'pas de panneau d’absence');
      });
    });
  }
  assert.deepEqual(retours[0], retours[1], 'plafond : 8 h et 30 h rapportent la même chose');
});

test('recette 2 : horloge reculée — aucun gain, partie intacte', async () => {
  const { ecrite, arme } = await partieEnCours();
  await avecJeu(relancer({ ...ecrite }, T0 - 5 * HEURE), jeu => {
    const s = jeu.stockage();
    assert.equal(jeu.el('offline').textContent, '');
    assert.equal(s.gold, ecrite.gold);
    assert.deepEqual(s.equipe, { arme });
    assert.deepEqual(s.talents, { assaut: 1 });
    assert.equal(s.zone, 'ruines');
    jeu.avancer(5_000);
    assert.equal(jeu.stockage().last, T0 - 5 * HEURE + 5_000, 'la partie continue');
  });
});
