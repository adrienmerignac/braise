import { surveillerMiseAJour } from './mise-a-jour.js';

// Enregistre le service worker de pré-cache ; un échec (API absente, http, navigation privée) ne doit rien casser.
// `surMiseAJour(worker)` est appelé quand une nouvelle version attend (jamais à la première installation).
export function enregistrerServiceWorker(nav = globalThis.navigator, fenetre = globalThis.window, surMiseAJour = null) {
  if (!nav || !('serviceWorker' in nav) || !fenetre) return;
  const suivre = reg => { if (surMiseAJour && reg) { try { surveillerMiseAJour(reg, nav, surMiseAJour); } catch {} } };
  const enregistrer = () => { try { Promise.resolve(nav.serviceWorker.register('./sw.js')).then(suivre).catch(() => {}); } catch {} };
  if (fenetre.document?.readyState === 'complete') enregistrer();
  else fenetre.addEventListener('load', enregistrer, { once: true });
}
