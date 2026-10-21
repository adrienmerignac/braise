// Simulation du premier parcours : joue le moteur pur (dist/engine) tick par tick, sans DOM ni horloge réelle.
// Usage : node tools/simulate.mjs [durée en minutes, 30 par défaut] [--etage=500] [--farm]
//   --etage=N : s'arrête dès que l'étage N est atteint (la durée devient un plafond, 1 000 000 minutes par défaut) ;
//   --farm : politique « patient » (voir ci-dessous) ; sans elle, politique fixe historique.
//
// Politique fixe (aucun rééquilibrage, seulement une mesure) :
//   1 tick = ATTACK_INTERVAL_MS de temps de jeu (jamais le framerate), un coup automatique par tick ;
//   au début de chaque tick :
//     0. dépense les points de talent libres selon `build` ;
//     1. achète l'amélioration la moins chère tant que l'or le permet (égalité : arme, armure, fortune) ;
//     2. lance le gardien dès KILLS_PER_STAGE victoires ;
//     3. voyage vers la zone suivante dès qu'elle est ouverte (le héros est alors retenu au dernier étage de sa zone) ;
//     4. utilise la compétence (× SKILL_MULT, recharge SKILL_COOLDOWN_SECONDS) dès qu'elle est prête,
//        en plus du coup automatique du même tick ; la recharge baisse d'un intervalle d'attaque par tick.
//   Politique `farm` (M5.5) : identique, mais le gardien n'est lancé que si `assessGuardian` ne le juge pas « Mortel » ; sinon le héros
//   continue d'affronter les ennemis ordinaires (or et expérience) jusqu'à ce que le mur soit franchissable. Les talents `build` s'appliquent.
//   `etatAuPalier(etage)` : état de stress sans simulation (héros au plafond de chaque amélioration) pour tester les étages 500 ou 2000.
// Jalons de parcours : `ruinesSeconds` (victoire du gardien de l'étage 5, ruines ouvertes), `cryptesSeconds` (étage 10, cryptes
// ouvertes) et `gardien15Seconds` (étage 15, objectif gardien des cryptes) ; null si non atteint dans la durée simulée.
// Temps moyen par victoire à l'étage 1 : instant de la dernière victoire normale de l'étage 1 / nombre de ces victoires.
// Les temps sont en secondes de jeu, mesurés à la fin du tick qui produit l'événement (achat : au début du tick).
import { fresh, cost, upgradeAtMax } from '../dist/engine/state.js';
import { newFight, startBoss, buyUpgrade, strike, assessGuardian, xpNeeded } from '../dist/engine/combat.js';
import { voyager, zoneOuverte } from '../dist/engine/zones.js';
import { rechargeCompetence, investir } from '../dist/engine/talents.js';
import { creerObjet } from '../dist/engine/equipement.js';
import { ATTACK_INTERVAL_MS, SKILL_MULT, KILLS_PER_STAGE, ZONE_IDS, UPGRADE_MAX_LEVEL, TALENT_IDS, TALENT_MAX_RANK, EQUIPMENT_UPGRADE_MAX } from '../dist/engine/balance.js';

const UPGRADES = ['weapon', 'armor', 'luck'];
const round = n => n === null ? null : Math.round(n * 100) / 100;

// `build` : talents dépensés dans l'ordre dès qu'un point est libre (ex. ['assaut', 'assaut', 'assaut']) ; vide par défaut.
// `etageCible` : arrêt anticipé dès que l'étage est atteint. `observer(s, f, tick)` : appelé à la fin de chaque tick (mesure, jamais d'effet).
export function simulate({ minutes = 30, build = [], politique = 'gardien', etageCible = Infinity, observer = null } = {}) {
  const dt = ATTACK_INTERVAL_MS / 1000;
  const ticks = Math.floor(minutes * 60 / dt);
  let s = fresh(0), f = newFight(s).f;
  let cool = 0, firstPurchase = null, firstBoss = null, stage1Wins = 0, stage1LastWin = 0, purchases = 0, retreats = 0;
  const jalons = { 5: { t: null }, 10: { t: null }, 15: { t: null } };
  const apply = (r, time) => {
    const etageVaincu = s.stage;
    s = r.s; f = r.f;
    for (const e of r.events) {
      if (e.type === 'bossVictory' && firstBoss === null) firstBoss = time;
      if (e.type === 'bossVictory') for (const [etage, jalon] of Object.entries(jalons)) if (+etage === etageVaincu && jalon.t === null) jalon.t = time;
      if (e.type === 'retreat') retreats++;
      if (e.type === 'victory' && r.s.stage === 1) { stage1Wins++; stage1LastWin = time; }
    }
  };
  let ticksJoues = 0;
  for (let tick = 0; tick < ticks && s.stage < etageCible; tick++) {
    ticksJoues++;
    const start = tick * dt, end = (tick + 1) * dt;
    for (const id of build) s = investir(s, id);
    for (;;) {
      const achetables = UPGRADES.filter(k => !upgradeAtMax(s, k));
      if (!achetables.length) break;
      const kind = achetables.reduce((a, b) => cost(s, b) < cost(s, a) ? b : a);
      if (s.gold < cost(s, kind)) break;
      apply(buyUpgrade(s, f, kind), start);
      purchases++;
      if (firstPurchase === null) firstPurchase = start;
    }
    if (s.kills >= KILLS_PER_STAGE && !f.boss && (politique !== 'farm' || assessGuardian(s).danger !== 'Mortel')) apply(startBoss(s, f), start);
    const suivante = ZONE_IDS[ZONE_IDS.indexOf(s.zone) + 1];
    if (suivante && zoneOuverte(s, suivante)) apply(voyager(s, f, suivante), start);
    if (cool <= 0) { cool = rechargeCompetence(s); apply(strike(s, f, SKILL_MULT), end); }
    apply(strike(s, f), end);
    cool -= dt;
    if (observer) observer(s, f, tick);
  }
  return {
    stage1AvgWinSeconds: stage1Wins ? round(stage1LastWin / stage1Wins) : null, firstPurchaseSeconds: round(firstPurchase), firstBossSeconds: round(firstBoss),
    ruinesSeconds: round(jalons[5].t), cryptesSeconds: round(jalons[10].t), gardien15Seconds: round(jalons[15].t),
    stageReached: s.stage, purchases, retreats, minutes, ...(etageCible < Infinity && { secondesJouees: round(ticksJoues * dt) }),
  };
}

// Héros de stress à l'étage `etage` : améliorations au plafond, talents au maximum, équipement épique amélioré, niveau 3 × étage,
// or et expérience proches de leurs plafonds de sauvegarde, gardien prêt. Tout est à sa valeur la plus haute permise par le schéma.
export function etatAuPalier(etage) {
  const s = fresh(0);
  const niveau = Math.min(100000, Math.max(1, 3 * etage));
  const talents = Object.fromEntries(TALENT_IDS.map(id => [id, TALENT_MAX_RANK]));
  const equipe = { arme: creerObjet('arme', 'epique', etage, EQUIPMENT_UPGRADE_MAX), armure: creerObjet('armure', 'epique', etage, EQUIPMENT_UPGRADE_MAX), charme: creerObjet('charme', 'epique', etage, EQUIPMENT_UPGRADE_MAX) };
  const zone = ZONE_IDS[ZONE_IDS.length - 1];
  const r = { ...s, stage: etage, meilleurEtage: etage, zone: etage > 10 ? zone : etage > 5 ? 'ruines' : 'foret', level: niveau, weapon: UPGRADE_MAX_LEVEL, armor: UPGRADE_MAX_LEVEL, luck: UPGRADE_MAX_LEVEL, talents, equipe, kills: KILLS_PER_STAGE, gold: 1e14 };
  return { ...r, xp: xpNeeded(r) - 1 };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const args = process.argv.slice(2), valeur = nom => args.find(a => a.startsWith(`--${nom}=`))?.split('=')[1];
  const etageCible = Number(valeur('etage')) || Infinity;
  const minutes = Number(args.find(a => /^\d/.test(a))) || (etageCible < Infinity ? 1e6 : 30);
  const r = simulate({ minutes, etageCible, politique: args.includes('--farm') ? 'farm' : 'gardien', build: (valeur('build') ?? '').split(',').filter(Boolean) });
  console.log(JSON.stringify(r, null, 2));
}
