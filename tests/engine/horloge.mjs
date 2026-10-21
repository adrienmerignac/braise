// Harnais déterministe : horloge virtuelle, stockage et DOM factices pour exécuter dist/game.js dans Node.
// Aucun timer réel : `avancer(ms)` déclenche les setInterval dans l'ordre chronologique.
let compteur = 0;

function element() {
  const classes = new Set();
  return {
    textContent: '', innerHTML: '', disabled: false, onclick: null, style: {}, offsetWidth: 0,
    classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
    append() {}, showModal() {}, close() {},
  };
}

export async function lancerJeu({ debut = 1_000_000, sauvegarde = null, stockageV2 = null } = {}) {
  let maintenant = debut;
  const minuteurs = [];
  const elements = new Map();
  const stockage = new Map(sauvegarde ? [['braise-v1', JSON.stringify(sauvegarde)]] : stockageV2 ? [['braise-v2', JSON.stringify(stockageV2)]] : []);
  const evenements = [];
  const dateNow = Date.now;
  const precedent = { document: globalThis.document, window: globalThis.window,
    localStorage: globalThis.localStorage, setInterval: globalThis.setInterval, confirm: globalThis.confirm };

  Date.now = () => maintenant;
  globalThis.document = {
    getElementById: id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    createElement: () => element(),
    addEventListener() {},
  };
  globalThis.window = { dispatchEvent: e => evenements.push(e), addEventListener() {} };
  globalThis.localStorage = { getItem: k => stockage.get(k) ?? null, setItem: (k, v) => stockage.set(k, String(v)) };
  globalThis.setInterval = (fn, ms) => { minuteurs.push({ fn, ms, prochain: maintenant + ms }); return minuteurs.length; };
  globalThis.confirm = () => true;

  await import(`../../dist/game.js?run=${++compteur}`);

  const jeu = {
    el: id => elements.get(id),
    texte: id => elements.get(id).textContent,
    stockage: () => JSON.parse(stockage.get('braise-v2')),
    evenements,
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
    fermer() { Date.now = dateNow; Object.assign(globalThis, precedent); },
  };
  return jeu;
}
