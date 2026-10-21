// Enregistre le service worker de pré-cache ; un échec (API absente, http, navigation privée) ne doit rien casser.
export function enregistrerServiceWorker(nav = globalThis.navigator, fenetre = globalThis.window) {
  if (!nav || !('serviceWorker' in nav) || !fenetre) return;
  const enregistrer = () => { try { Promise.resolve(nav.serviceWorker.register('./sw.js')).catch(() => {}); } catch {} };
  if (fenetre.document?.readyState === 'complete') enregistrer();
  else fenetre.addEventListener('load', enregistrer, { once: true });
}
