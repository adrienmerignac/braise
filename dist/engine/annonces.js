// Décide ce qui est annoncé aux lecteurs d'écran (région #alert) : seulement les événements rares. Pur, sans DOM.
// Un coup ordinaire, une victoire ordinaire, une recharge ou une mise à jour de barre ne sont jamais annoncés.
export function annoncePour(e) {
  switch (e && e.type) {
    case 'retreat':
      return `Repli : ${e.boss ? 'le gardien' : 'l’ennemi'} frappait pour ${e.taken}, il lui restait ${Math.max(0, Math.ceil(e.enemyHP))} PV. Butin conservé.`;
    case 'bossVictory':
      return `Gardien vaincu ! L’étage ${e.stage} s’ouvre.`;
    case 'levelup':
      return `Niveau ${e.level} atteint.`;
    case 'achatImpossible':
      return 'Achat impossible : pas assez d’or.';
    default:
      return null;
  }
}

// Rassemble les annonces d'un même run() en une seule phrase : une seule mise à jour de #alert par frame,
// sinon la dernière écraserait les précédentes (gardien vaincu puis niveau gagné).
export function annoncesPour(events) {
  return (events || []).map(annoncePour).filter(Boolean).join(' ') || null;
}
