# Roadmap Braise

Cette roadmap sert de backlog commun à Adrien, Codex et Claude. Les cases cochées correspondent à des éléments livrés, pas à des intentions. Les jalons sont ordonnés par dépendances plutôt que par dates promises. Une étape doit rester jouable et vérifiable.

**Priorité actuelle : M1 — fiabiliser le cœur avant d’ajouter du contenu.**

## M0 — Prototype et fondations du projet

- [x] Combat auto, or, expérience, niveaux et trois améliorations.
- [x] Compétence active, gardien et progression d’étage.
- [x] Sauvegarde locale et estimation des gains d’absence.
- [x] Interface desktop/mobile en français.
- [x] Forêt LPC, héros équipé, gobelin et séquences de combat animées.
- [x] Correction des directions de sprites par planche.
- [x] Documentation commune Codex/Claude, relance et roadmap.
- [x] Créer le dépôt privé GitHub et pousser les sources avec leur historique.
- [x] Configurer les contrôles GitHub Actions et examiner la première exécution.
- [x] Obtenir une CI verte : dépôt passé en public le 2026-10-21 (Actions et Pages gratuites), contrôles verts sur `main`, jeu publié sur https://adrienmerignac.github.io/braise/.

**Sortie :** projet clonable, lancement documenté, contrôles reproductibles, gobelin tourné vers le héros en marche et en attaque.

## M1 — Moteur et sauvegardes fiables · P0

Dépend de M0. Objectif : rendre le jeu testable et préserver les parties avant tout ajout structurel.

- [ ] **M1.1** Extraire état initial, statistiques, récompenses et combat dans des modules sans DOM ; conserver le comportement et l’interface.
- [ ] **M1.2** Ajouter des tests déterministes : victoire, défaite, gardien, montée de niveau, achat, fonds insuffisants, compétence et pause.
- [ ] **M1.3** Valider tous les champs de sauvegarde, nombres non finis, bornes et JSON corrompu ; traiter stockage indisponible/quota sans crash.
- [ ] **M1.4** Versionner le schéma et migrer les parties `braise-v1` ; export/import JSON avec validation et confirmation avant remplacement.
- [ ] **M1.5** Unifier absence, onglet masqué et rechargement : plafond 8 h, aucune double collecte, horloge reculée, décisions explicites sur les défaites hors ligne.
- [ ] **M1.6** Initialiser la scène avant les premiers événements et synchroniser résolution du coup, chute, entrée suivante et taille du gardien.
- [ ] **M1.7** Définir et tester ce qui persiste : vie, ennemi, recharge et pause. Empêcher les rechargements d’être un moyen involontaire de tout restaurer.

**Sortie :** suite moteur verte ; ancienne partie migrée sans perte ; export/import aller-retour ; gains identiques pour une même durée ; contrôles desktop/mobile verts. Pas de nouveau biome dans ce jalon.

## M2 — Combats satisfaisants et premier parcours · P0

Dépend de M1. Objectif : 20–30 minutes de progression intéressante.

- [ ] **M2.1** Centraliser les chiffres d’équilibrage et simuler temps par victoire, premier achat et premier gardien.
- [ ] **M2.2** Distinguer visuellement et mécaniquement trois ennemis de forêt ; vrai gardien avec silhouette et séquence d’attaque propres.
- [ ] **M2.3** Afficher clairement puissance, danger, dégâts reçus, soins et raison d’une défaite.
- [ ] **M2.4** Ajouter récompense de gardien et panneau de victoire, sans bloquer les combats ordinaires.
- [ ] **M2.5** Ajouter sons de pas, coup et feu optionnels ; bouton muet et volume, aucun son avant interaction utilisateur.
- [ ] **M2.6** Améliorer la première minute : tutoriel court, premier achat guidé, explication du gardien et de l’absence.

**Sortie :** un nouveau joueur comprend la boucle sans lire la documentation ; premier gardien atteignable sans grind disproportionné ; son facultatif et contrôles tactiles accessibles.

## M3 — Équipement et choix de build · P1

Dépend de M1 et du bilan M2.

- [ ] **M3.1** Définir slots, statistiques, raretés et tables de loot limitées ; expliquer les chances et éviter une inflation prématurée.
- [ ] **M3.2** Inventaire, équipement, comparaison avant/après ; conserver le loot pendant l’absence selon une règle explicite.
- [ ] **M3.3** Recyclage et amélioration d’équipement avec confirmation pour les objets importants.
- [ ] **M3.4** Représenter l’équipement du héros via les couches LPC compatibles et créditées.
- [ ] **M3.5** Ajouter quelques talents qui modifient le style de jeu ; possibilité de réinitialiser pour essayer.

**Sortie :** au moins deux builds viables, choix lisibles sur petit écran, aucune perte d’objet lors d’une migration/reprise. Inventaire testé et accessible au clavier.

## M4 — Monde et variété · P1

Dépend de M2 ; M3 peut être livré séparément.

- [ ] **M4.1** Carte simple de sélection de zone : forêt → ruines → cryptes, conditions d’accès explicites.
- [ ] **M4.2** Décors LPC assortis et animations propres aux zones ; transitions et éclairages cohérents.
- [ ] **M4.3** Bestiaire avec résistances/modificateurs compréhensibles, ennemis et gardiens distincts par zone.
- [ ] **M4.4** Objectifs de zone, butin spécifique et retour possible dans une zone précédente.
- [ ] **M4.5** Court fil narratif autour de la braise et du camp, sans longs dialogues obligatoires.

**Sortie :** trois zones réellement différentes, rythme testé du début à la dernière zone, chargement d’assets et lisibilité mobile maîtrisés.

## M5 — Progression longue durée · P2

Dépend d’un retour joueur sur M3/M4 ; ne pas ajouter du prestige pour masquer un équilibrage insuffisant.

- [ ] **M5.1** Définir durée cible d’une expédition et progression permanente ; simuler plusieurs jours de jeu.
- [ ] **M5.2** Prestige/rallumage de la braise avec aperçu exact des gains et de ce qui sera remis à zéro.
- [ ] **M5.3** Succès et objectifs variés, collection de bestiaire ; pas de série quotidienne punitive.
- [ ] **M5.4** Automatisations déblocables pour les actions répétitives, avec limites et réglages clairs.
- [ ] **M5.5** Tester plafonds numériques, coûts et rendements à haut niveau ; éviter les valeurs infinies et softlocks.

**Sortie :** une deuxième expédition change les décisions ; remise à zéro explicitement confirmée ; progression de plusieurs jours cohérente et récupérable via export.

## M6 — Confort mobile, accessibilité et performance · P1 transversal

À améliorer dès M1 ; finalisation avant diffusion publique.

- [ ] **M6.1** Tester 360 px, 390 px, tablette, desktop et paysage ; zones tactiles, panneaux et inventaire adaptés.
- [ ] **M6.2** Ajouter réglages d’effets, mouvement réduit, volume et taille de texte, persistés.
- [ ] **M6.3** Mesurer rendu et consommation sur mobile réel ; plafonner particules et réduire/arrêter le rendu masqué.
- [ ] **M6.4** Audit clavier, focus, contrastes et annonces accessibles ; ne pas annoncer chaque tick de combat aux lecteurs d’écran.
- [ ] **M6.5** Assets reproductibles : références amont figées, contrôle des licences et suppression des fichiers réellement inutilisés.
- [ ] **M6.6** Étudier PWA/installabilité et cache hors ligne ; prévoir mises à jour du cache sans perte de sauvegarde.

**Sortie :** recette multiécran documentée, réglages respectés, budget performance défini puis mesuré sur au moins un vrai mobile. PWA seulement si elle améliore l’usage.

## M7 — Bêta et diffusion · P2

Dépend de M1/M2 et de la recette M6 ; périmètre de contenu choisi à ce moment-là.

- [ ] **M7.1** Recette complète d’une nouvelle partie, d’une partie migrée et d’un retour après huit heures.
- [ ] **M7.2** Choisir licence du code, nom public et politique de contributions ; conserver les obligations des assets indépendamment du choix du code.
- [ ] **M7.3** Définir hébergement public, sauvegardes et migration d’origine ; demande explicite avant changement de visibilité.
- [ ] **M7.4** Tester la version avec quelques joueurs et consigner incompréhensions/bugs sans télémétrie imposée.
- [ ] **M7.5** Changelog, version de release, procédure de retour arrière et vérification du déploiement.
- [ ] **M7.6** Décider après retours si un compte/synchronisation apporte assez de valeur pour introduire un backend.

**Sortie :** version publiable et récupérable, crédits complets, aucun bug bloquant connu dans les parcours de référence.

## Hors périmètre actuel

Multijoueur, PvP, marché entre joueurs, boutique payante, pubs, gacha et application native. Ces idées n’imposent aucune architecture au prototype.

## Comment utiliser la roadmap

1. Choisir une tâche et préciser les critères de fin pertinents avec la demande en cours.
2. Livrer une petite tranche ; mettre à jour tests, docs et relance.
3. Cocher uniquement ce qui est vérifié. Noter les limites sans décaler silencieusement le périmètre.
4. Réordonner les jalons selon les retours d’Adrien ; ne pas attribuer des dates arbitraires.
