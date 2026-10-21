// Réglages et règles audio, purs : aucun accès au DOM ni à Web Audio (branché côté navigateur, voir game.js).
export const AUDIO_DEFAUT = Object.freeze({ muet: false, volume: 0.6 });

export const volumeValide = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
export const reglagesValides = a => typeof a === 'object' && a !== null && !Array.isArray(a) && typeof a.muet === 'boolean' && volumeValide(a.volume);

// Réglages sûrs : champ par champ, une valeur invalide est remplacée par le défaut.
export const normaliserReglages = a => {
  const r = typeof a === 'object' && a !== null ? a : {};
  return { muet: typeof r.muet === 'boolean' ? r.muet : AUDIO_DEFAUT.muet, volume: volumeValide(r.volume) ? r.volume : AUDIO_DEFAUT.volume };
};

// Rien ne se joue avant la première interaction, en muet, à volume nul, en pause ou onglet masqué.
export const peutJouer = (reglages, interactionFaite, pause, masque) => {
  const r = normaliserReglages(reglages);
  return interactionFaite === true && !r.muet && r.volume > 0 && !pause && !masque;
};

// Gain effectif pour Web Audio (0 si muet).
export const gainEffectif = reglages => { const r = normaliserReglages(reglages); return r.muet ? 0 : r.volume; };

// Registre de sons : vide tant qu'aucun son n'est enregistré, `jouer` n'a alors aucun effet.
export function creerAudio({ lire } = {}) {
  const sons = new Map();
  return {
    enregistrer(nom, son) { sons.set(nom, son); },
    // `etat` : { reglages, interactionFaite, pause, masque }. Retourne true si le son a été demandé.
    jouer(nom, etat) {
      if (!sons.has(nom) || !etat || !peutJouer(etat.reglages, etat.interactionFaite, etat.pause, etat.masque)) return false;
      if (lire) lire(sons.get(nom), gainEffectif(etat.reglages));
      return true;
    },
  };
}
