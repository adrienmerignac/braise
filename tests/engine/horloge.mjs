// Harnais déterministe : horloge virtuelle, stockage et DOM factices pour exécuter dist/game.js dans Node.
// Aucun timer réel : `avancer(ms)` déclenche les setInterval dans l'ordre chronologique.
let compteur = 0;

// Le focus est suivi : focus() fixe document.activeElement. `contains` reconnaît le bouton enfant de son panneau.
const ENFANTS = { guidepanel: ['guideclose'], bosspanel: ['bossclose'], bossintro: ['bossintroclose'], absenceintro: ['absenceintroclose'] };

function element(id, doc) {
  const classes = new Set();
  const ecouteurs = {};
  const el = {
    id, textContent: '', innerHTML: '', disabled: false, onclick: null, style: {}, offsetWidth: 0, open: false,
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
    children: [], replaceChildren(...c) { el.children = c; }, append() {}, setAttribute() {},
    click() { doc.telechargements.push({ nom: el.download, blob: el.href }); },
    showModal() { el.open = true; },
    close() { if (!el.open) return; el.open = false; (ecouteurs.close || []).forEach(fn => fn({ type: 'close' })); },
    addEventListener(type, fn) { (ecouteurs[type] ||= []).push(fn); },
    contains: x => x === el || (ENFANTS[id] || []).some(c => doc.elements.get(c) === x),
    focus() { doc.activeElement = el; },
    hidden: id in ENFANTS || id === 'secours' || id === 'secoursancien', offsetParent: {}, isConnected: true, firstElementChild: { textContent: '' },
  };
  return el;
}

export async function lancerJeu({ debut = 1_000_000, sauvegarde = null, stockageV2 = null, stockageBrut = null } = {}) {
  let maintenant = debut;
  const minuteurs = [];
  const elements = new Map();
  const stockage = new Map(stockageBrut ? Object.entries(stockageBrut) : sauvegarde ? [['braise-v1', JSON.stringify(sauvegarde)]] : stockageV2 ? [['braise-v2', JSON.stringify(stockageV2)]] : []);
  const evenements = [];
  const dateNow = Date.now;
  const precedent = { document: globalThis.document, window: globalThis.window,
    localStorage: globalThis.localStorage, setInterval: globalThis.setInterval, confirm: globalThis.confirm };

  Date.now = () => maintenant;
  const touches = [];
  const racine = { dataset: {} };
  const doc = { elements, activeElement: null, telechargements: [] };
  const urlPrecedent = { c: URL.createObjectURL, r: URL.revokeObjectURL };
  URL.createObjectURL = blob => blob; URL.revokeObjectURL = () => {};
  globalThis.document = Object.assign(doc, {
    getElementById: id => { if (!elements.has(id)) elements.set(id, element(id, doc)); return elements.get(id); },
    createElement: () => element(null, doc),
    addEventListener(type, fn) { if (type === 'keydown') touches.push(fn); },
    documentElement: racine,
  });
  globalThis.window = { dispatchEvent: e => evenements.push(e), addEventListener() {} };
  globalThis.localStorage = { getItem: k => stockage.get(k) ?? null, setItem: (k, v) => stockage.set(k, String(v)) };
  globalThis.setInterval = (fn, ms) => { minuteurs.push({ fn, ms, prochain: maintenant + ms }); return minuteurs.length; };
  globalThis.confirm = () => true;
  globalThis.requestAnimationFrame = fn => { fn(); return 0; };

  await import(`../../dist/game.js?run=${++compteur}`);

  const jeu = {
    el: id => document.getElementById(id),
    texte: id => elements.get(id).textContent,
    stockage: () => JSON.parse(stockage.get('braise-v2')),
    evenements,
    actif: () => doc.activeElement,
    focus: id => elements.get(id).focus(),
    echap: () => touches.forEach(fn => fn({ key: 'Escape' })),
    racine,
    clic: id => elements.get(id).onclick(),
    avancer(ms) {
      const fin = maintenant + ms;
      for (;;) {
        const due = minuteurs.filter(m => m.prochain <= fin).sort((a, b) => a.prochain - b.prochain)[0];
        if (!due) break;
        maintenant = due.prochain;
        due.prochain += due.ms;
        due.fn();
      }
      maintenant = fin;
    },
    telechargements: doc.telechargements,
    stockageBrut: cle => stockage.get(cle),
    fermer() { Date.now = dateNow; URL.createObjectURL = urlPrecedent.c; URL.revokeObjectURL = urlPrecedent.r; Object.assign(globalThis, precedent); },
  };
  return jeu;
}
