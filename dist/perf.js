// Relevé de performance activé par ?perf : fonctions pures (testées) puis encart DOM. Rien n'est envoyé sur le réseau.
export const FENETRE_MS = 2000; // durée de la fenêtre de mesure et période de rafraîchissement de l'encart
export const BUDGET = { moyenneMs: 16.7, pireMs: 33 }; // valeurs de départ, voir docs/TESTING.md

export function perfActif(search) {
  return new URLSearchParams(search || '').has('perf');
}

const arrondi = (n, d = 1) => Number(n.toFixed(d));

// `durees` : temps de `draw` (ms) des images de la fenêtre ; `fenetreMs` : durée réelle de la fenêtre.
export function agreger(durees, fenetreMs = FENETRE_MS) {
  const n = durees.length;
  if (!n || !(fenetreMs > 0)) return { images: 0, fps: 0, moyenne: 0, pire: 0 };
  return {
    images: n,
    fps: arrondi(n * 1000 / fenetreMs),
    moyenne: arrondi(durees.reduce((a, d) => a + d, 0) / n, 2),
    pire: arrondi(Math.max(...durees), 2),
  };
}

export function etatRendu({ pause, boucleActive, masque }) {
  if (masque) return 'onglet masqué';
  if (pause && !boucleActive) return 'rendu arrêté en pause';
  return 'actif';
}

export function formaterEncart(m, { etincelles, etat }) {
  return [
    `${m.fps} i/s`,
    `draw moy. ${m.moyenne} ms · pire ${m.pire} ms`,
    `étincelles ${etincelles}`,
    `rendu : ${etat}`,
  ];
}

export function formaterReleve(m, { etincelles, etat, version, userAgent, ecran, dpr }) {
  return [
    `Braise ${version}`, `UA ${userAgent}`, `écran ${ecran}`, `dpr ${dpr}`,
    `fps ${m.fps}`, `draw moy ${m.moyenne} ms`, `draw pire ${m.pire} ms`,
    `étincelles ${etincelles}`, `rendu ${etat}`,
  ].join(' | ');
}

// Retourne null sans ?perf (aucun coût) ; sinon une sonde : `sonde.image(dureeMs)` à chaque `draw`.
// `lire()` donne { pause, boucleActive, etincelles } au moment du rafraîchissement.
export function demarrerPerf({ search, document: doc, navigator: nav, screen, devicePixelRatio, lire, setInterval: planifier = setInterval }) {
  if (!perfActif(search)) return null;
  let durees = [], dernier = '';
  const version = /\d+\.\d+\.\d+/.exec(doc.querySelector('footer small')?.textContent || '')?.[0] || 'inconnue';
  const boite = doc.getElementById('perf');
  const texte = doc.getElementById('perftexte');
  const bouton = doc.getElementById('perfcopier');
  const retour = doc.getElementById('perfretour');
  boite.hidden = false;
  const instantane = () => {
    const m = agreger(durees);
    const l = lire();
    return { m, ctx: { etincelles: l.etincelles, etat: etatRendu({ pause: l.pause, boucleActive: l.boucleActive, masque: doc.hidden }) } };
  };
  planifier(() => {
    const { m, ctx } = instantane();
    durees = [];
    dernier = formaterReleve(m, { ...ctx, version, userAgent: nav.userAgent, ecran: `${screen.width}x${screen.height}`, dpr: devicePixelRatio });
    texte.textContent = formaterEncart(m, ctx).join(' · ');
  }, FENETRE_MS);
  bouton.addEventListener('click', async () => {
    if (!dernier) { retour.textContent = 'Patienter 2 s avant le premier relevé.'; return; }
    try { await nav.clipboard.writeText(dernier); retour.textContent = 'Relevé copié.'; }
    catch { retour.textContent = 'Copie impossible : sélectionner le texte du relevé.'; texte.dataset.releve = dernier; }
  });
  return { image: ms => { durees.push(ms); } };
}
