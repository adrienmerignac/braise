// Recettes des sons synthétisés et choix des sons par événement de scène : pur, sans DOM ni Web Audio (voir game.js pour la lecture).
// `source` : 'oscillateur' (fréquence glissant de `freq[0]` à `freq[1]`) ou 'bruit' (bruit blanc filtré, `filtre` passe-bande/bas à `freq`).
// Enveloppe : montée linéaire sur `attaque` s jusqu'à `pic` (≤ 1), puis descente exponentielle jusqu'à `duree` s.
export const DUREE_MAX_SON_MS = 400;
export const IMPACT_DELAI_MS = 330; // les étincelles de la scène partent à `attackAt + 330`
export const PAS_DELAIS_MS = Object.freeze([120, 300, 480]);

export const RECETTES = Object.freeze({
  coup: Object.freeze({ source: 'oscillateur', type: 'triangle', freq: [150, 55], duree: 0.18, attaque: 0.004, pic: 0.7 }),
  'coup-gardien': Object.freeze({ source: 'oscillateur', type: 'triangle', freq: [90, 38], duree: 0.24, attaque: 0.005, pic: 0.8 }),
  feu: Object.freeze({ source: 'bruit', filtre: { type: 'bandpass', freq: 900, q: 0.8 }, duree: 0.4, attaque: 0.05, pic: 0.6 }),
  pas: Object.freeze({ source: 'bruit', filtre: { type: 'lowpass', freq: 500, q: 0.7 }, duree: 0.08, attaque: 0.005, pic: 0.35 }),
});

export const recetteValide = r => !!r && (r.source === 'oscillateur' || r.source === 'bruit')
  && Number.isFinite(r.duree) && r.duree > 0 && r.duree * 1000 <= DUREE_MAX_SON_MS
  && Number.isFinite(r.attaque) && r.attaque >= 0 && r.attaque < r.duree
  && Number.isFinite(r.pic) && r.pic > 0 && r.pic <= 1
  && (r.source === 'bruit' ? !!r.filtre && Number.isFinite(r.filtre.freq) && r.filtre.freq > 0 : Array.isArray(r.freq) && r.freq.length === 2 && r.freq.every(f => Number.isFinite(f) && f > 0));

// Sons à jouer pour un événement de scène : [{ nom, delaiMs }] (délai depuis l'instant où la scène reçoit l'événement).
export function sonsPourEvenement(type, detail = {}, { mouvementReduit = false } = {}) {
  if (type === 'combat') return [{ nom: detail.strong ? 'feu' : detail.boss ? 'coup-gardien' : 'coup', delaiMs: IMPACT_DELAI_MS }];
  if (type === 'spawn') return mouvementReduit ? [] : PAS_DELAIS_MS.map(delaiMs => ({ nom: 'pas', delaiMs }));
  return [];
}
