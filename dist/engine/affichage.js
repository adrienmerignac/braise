// Réglages d'affichage purs : mouvement réduit et effets visuels. Aucun accès au DOM (branché dans game.js et scene.js).
export const MOUVEMENTS = Object.freeze(['systeme', 'reduit', 'complet']);
export const EFFETS = Object.freeze(['actifs', 'discrets']);
export const AFFICHAGE_DEFAUT = Object.freeze({ mouvement: 'systeme', effets: 'actifs' });

export const affichageValide = a => typeof a === 'object' && a !== null && !Array.isArray(a) && MOUVEMENTS.includes(a.mouvement) && EFFETS.includes(a.effets);

// Réglages sûrs : champ par champ, une valeur invalide est remplacée par le défaut.
export const normaliserAffichage = a => {
  const r = typeof a === 'object' && a !== null ? a : {};
  return { mouvement: MOUVEMENTS.includes(r.mouvement) ? r.mouvement : AFFICHAGE_DEFAUT.mouvement, effets: EFFETS.includes(r.effets) ? r.effets : AFFICHAGE_DEFAUT.effets };
};

// `systeme` suit `prefers-reduced-motion` ; `reduit` et `complet` l'emportent sur la préférence système.
export const mouvementReduit = (reglage, prefereSysteme) => reglage === 'reduit' ? true : reglage === 'complet' ? false : prefereSysteme === true;

// Étincelles, secousse du coup fort et lucioles ; l'arc de coup, les chiffres de dégâts et « −N PV » restent toujours affichés.
export const effetsDiscrets = reglage => normaliserAffichage({ effets: reglage }).effets === 'discrets';
