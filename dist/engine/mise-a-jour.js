// Mise à jour du service worker sans surprise : le bandeau n'apparaît que pour une vraie mise à jour,
// et le rechargement n'a lieu qu'une fois, après un clic du joueur. Aucune écriture de sauvegarde ici : on appelle `sauvegarder`.

// Un worker attend ET une version tourne déjà : à la première installation (aucun contrôleur), rien à proposer.
export function bandeauRequis({ waiting, controller } = {}) {
  return Boolean(waiting && controller);
}

// Observe l'enregistrement : appelle `afficher(workerEnAttente)` dès qu'une mise à jour attend, une seule fois.
export function surveillerMiseAJour(enregistrement, nav, afficher) {
  let affiche = false;
  const verifier = () => {
    if (affiche || !bandeauRequis({ waiting: enregistrement.waiting, controller: nav.serviceWorker?.controller })) return;
    affiche = true;
    afficher(enregistrement.waiting);
  };
  verifier();
  enregistrement.addEventListener?.('updatefound', () => {
    const worker = enregistrement.installing;
    worker?.addEventListener?.('statechange', () => { if (worker.state === 'installed') verifier(); });
  });
}

// Au clic : sauvegarde, SKIP_WAITING, puis un seul rechargement sur `controllerchange` (jamais de boucle).
export function appliquerMiseAJour({ worker, nav, sauvegarder, recharger }) {
  let demande = false;
  let recharge = false;
  nav.serviceWorker.addEventListener('controllerchange', () => {
    if (!demande || recharge) return;
    recharge = true;
    recharger();
  });
  return () => {
    if (demande) return;
    demande = true;
    try { sauvegarder(); } catch {}
    worker.postMessage({ type: 'SKIP_WAITING' });
  };
}
