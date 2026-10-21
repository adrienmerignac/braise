# Vérifier une étape

## Contrôle rapide

Prérequis Node.js 22+, sans dépendance npm :

```sh
npm run check
# équivalent : node tools/check.mjs
```

Le contrôle vérifie syntaxe des modules JS, références locales HTML, liens de la documentation, présence et dimensions des sprites utilisés et contrat de configuration statique. Il ne lance pas un navigateur et ne prouve pas que les animations sont visuellement correctes.

Équilibrage : `node tools/simulate.mjs [minutes]` joue le premier parcours sur le moteur pur (politique décrite en tête du script) et imprime, en secondes de jeu, victoire moyenne à l'étage 1, premier achat, premier gardien, ouverture des ruines (`ruinesSeconds`, gardien 5) et des cryptes (`cryptesSeconds`, gardien 10), gardien de l’étage 15 (`gardien15Seconds`) et étage atteint ; les constantes sont dans `dist/engine/balance.js`.

## Recette de référence

`tests/engine/recette-reprise.test.mjs` rejoue dans l'interface (`dist/game.js` piloté par `tests/engine/horloge.mjs`) les deux parcours de référence :

- **Partie migrée** : une partie `braise-v1` avancée (étage 9) s'ouvre sans perte, est réécrite en version 7 avec les défauts d'équipement, de talents, de zone, d'objectifs et de récits ; inventaire, talents et carte s'ouvrent et se ferment ; export puis import confirmé rendent la même partie.
- **Retour après huit heures** : une partie v7 en cours (zone, talents, objet équipé) relancée avec le même stockage après 8 h puis 30 h affiche le panneau d'absence avec les mêmes gains (plafond `OFFLINE_CAP_SECONDS`) ; un second lancement ne recrédite rien ; une horloge reculée ne donne aucun gain.

## Recette navigateur

```sh
python3 -m http.server 8080 --directory dist
```

Ouvrir http://localhost:8080 dans un vrai navigateur. Pour tester un téléphone sur le même réseau, utiliser l’adresse locale du poste et le port 8080. La sauvegarde est distincte entre domaines/ports/navigateurs.

| Cas | Vérification attendue |
| --- | --- |
| Chargement neuf | HUD cohérent, héros, décor et gobelin visibles ; pas d’asset manquant. |
| Orientation | Héros à gauche tourné à droite ; gobelin à droite tourné à gauche, y compris marche et riposte. |
| Combat normal | Vie ennemie diminue ; approche, coup et impact ; or/XP augmentent après victoire. |
| Compétence | Dégâts ×4, effet distinct, bouton désactivé pendant la recharge. |
| Chute et entrée | Ennemi vaincu tombe/disparaît ; le suivant arrive sans sprite inversé. |
| Amélioration | Achat possible avec assez d’or ; coût déduit une fois et statistique augmentée. |
| Pause | Or, combat et recharge n’avancent plus ; feu, particules et personnages se figent. Reprise sans saut excessif. |
| Gardien | Bloqué avant cinq victoires ; clic ensuite ; victoire ouvre l’étage suivant. |
| Sauvegarde | Recharger conserve or/niveau/étage/améliorations ; documenter toute migration testée. |
| Sauvegarde future | Avec `braise-v2 = {"version":3}` dans le stockage : message unique, rien écrit (tick, onglet masqué, achat, Nouvelle partie, import), Exporter rend le texte stocké. |
| Absence | Revenir après plus d’une minute : panneau de gains, plafond 8 h, absence de double collecte à rejouer après une modification. |
| Mobile | Recette multiécran : voir le tableau « Formats » ci-dessous. |
| Accessibilité | Navigation clavier, focus visible, texte lisible, préférence de réduction des mouvements prise en compte. |
| Son | Bouton « Son » (`aria-pressed` = son actif) et volume 0–100 % au clavier et au toucher ; actif à 60 % par défaut ; aucun contexte audio avant la première interaction ; suspendu en pause et onglet masqué ; réglages conservés au rechargement et à l’import. Coup sourd à l’impact affiché, souffle de flamme pour la frappe de braise, 2 à 4 pas à l’arrivée d’un adversaire (aucun en mouvement réduit) ; pas de salve après absence, retour d’onglet ou chargement. |
| Mouvement et effets | Défauts « Système » et « Actifs ». En « Réduit » : ni approche, ni balancement, ni pas, ni animation CSS (dégâts flottants, panneau du gardien, barres), même sans préférence système ; « Complet » les rétablit même si le système demande la réduction. En « Discrets » : ni étincelles, ni secousse, ni lucioles, mais l’arc de coup, les dégâts et « −N PV » restent. Application immédiate, conservation au rechargement et à l’import ; usage au clavier et au toucher. |
| Crédits | Lien du pied de page fonctionnel ; sources et licences présentes. |

Pour un changement de sprite, vérifier au moins marche, attaque et chute, pas seulement une frame immobile. Pour une évolution du moteur, ajouter des tests déterministes avec horloge et stockage simulés avant d’étendre la recette manuelle.

## Recette de référence

`tests/engine/recette-nouvelle-partie.test.mjs` rejoue une nouvelle partie (aucun stockage) par l'interface, avec le harnais `tests/engine/horloge.mjs` : horloge virtuelle, `Math.random` fixé, aucun timer réel. Parcours : tutoriel et premier achat guidé (coût débité une fois), coup toutes les 1,2 s et pause qui fige tout, explication puis combat du premier gardien (le panneau de victoire ne bloque pas la suite), objet équipé depuis l'inventaire, point de talent investi, ouverture des ruines (condition de `dist/engine/zones.js`), voyage par la Carte, récit annoncé sans bloquer, retour en forêt. Après chaque étape, la sauvegarde relue par `jeu.stockage()` est validée et comparée à l'affichage (or, niveau, étage, zone) : la partie est mise en pause le temps d'une écriture périodique de 5 s pour que la copie soit à jour.

Le joueur simulé suit la politique « patient » de `tools/simulate.mjs` (gardien lancé seulement s'il n'est pas « Mortel »). Le parcours demande environ 3 minutes de jeu simulé, donc aucune sauvegarde intermédiaire. Cette recette ne remplace pas la vérification visuelle en navigateur ci-dessus.

## Contrastes

`tests/engine/contrastes.test.mjs` lit les couleurs de `dist/style.css` (et du `<style>` de `dist/credits.html`) et calcule le ratio WCAG de chaque paire. Seuils : 4,5:1 pour le texte, 3:1 pour les contours et indicateurs. Le calcul ne dépend pas de la taille de texte ; le test vérifie que « Grand » ne redéfinit que `--texte`.

Paires contrôlées : texte courant, `--muted`, `--orange` et `--green` sur fond de page, panneau et bandeau des ressources ; étiquette, journal, dialogues ; boutons principal, secondaire, d’achat, désactivé/trop cher (détail à 80 % compris) et boutons du gardien/guide/dialogues ; barre audio et réglages ; bandeau et carte sur la scène (fond de scène supposé, le canvas n’est pas mesuré) ; crédits ; contours de focus, de contrôles, alerte mortelle et étapes du gardien.

Un bouton désactivé se lit aussi par son bord pointillé (pas d’opacité réduite) : la couleur n’est pas seule. Le test résout la cascade (spécificité puis ordre) pour un bouton désactivé sous `.upgrade`, `.guide-panel`, `.audio-bar`, `.boss-panel` et `dialog` : une règle de contexte plus tardive qui écraserait fond, couleur ou bord sans `:enabled` le fait échouer.

## Formats

À rejouer à chaque changement d’interface (mêmes points dans chacun des cinq formats, en texte « Normal » puis « Grand » à 360 px) :

| Format | Points vérifiés |
| --- | --- |
| 360 × 800 | Largeur du document = écran ; héros et ennemi face à face ; barre Pause/Son/Volume/réglages en tête ; commandes de combat collées en bas ; « Grand » sans chevauchement. **Inventaire** (sauvegarde importée, 24 objets) : liste défilable dans sa zone, sans débordement horizontal, comparaison avant/après lisible, Équiper / Améliorer / Recycler et confirmation de recyclage dans l’écran, boutons ≥ 44 px. **Talents** : nom, rang, effet et coût lisibles, Investir et Réinitialiser ≥ 44 px ; Échap ferme, focus visible. |
| 390 × 844 | Idem ; dialogues (bienvenue, absence, gardien) dans l’écran, bouton ≥ 44 px, Échap et focus rendu. |
| 844 × 390 (paysage) | Un seul défilement vertical ; au chargement la scène est sous le pli (barre Son/réglages sur une ligne), après défilement héros, ennemi et barre de combat collée en bas sont visibles ensemble, sans que la barre recouvre la scène ; panneau du gardien compact, contenu dans la scène. |
| 768 × 1024 | Deux colonnes sans débordement ; héros et ennemi visibles. |
| 1280 × 800 | Rendu bureau inchangé ; Inventaire et Talents sans régression. |

Panneau Carte (ouvert sur une partie à `meilleurEtage` 8, import de sauvegarde) : dans chaque format et en « Grand » à 360 px, il tient dans l’écran sans défilement horizontal ; chaque zone montre nom, étages, état et condition, prédilection de butin et ses deux objectifs sans texte coupé ; un récit débloqué se lit en entier, un récit verrouillé affiche sa condition ; « Voyager » et « Fermer » ≥ 44 × 44 px, focus visible, Échap ferme. Sous 680 px, « Voyager » passe sous le texte de la zone, pleine largeur.

Largeur : relever `scrollWidth` du document et vérifier qu’aucun descendant de `main` ne dépasse `innerWidth` (le `overflow-x:hidden` de `html` ne doit pas masquer un débordement). Texte « Grand » : choisi dans la liste (`Texte : Grand` visible sur la capture), pas seulement annoncé.

Dans tous les formats : zones tactiles ≥ 44 × 44 px (boutons, listes, curseur, Exporter/Importer, fermeture des panneaux), vérifié par `tests/engine/cibles-tactiles.test.mjs` pour la règle CSS, au navigateur pour la taille rendue.

Copie de secours : mettre `{pas du json` dans `braise-v2` (console), recharger → message « copie gardée » et bouton « Télécharger la copie » (clavier, ≥ 44 px) ; `braise-v2-secours` contient le texte exact, `braise-v2` une partie neuve. Un second texte corrompu ne remplace pas la copie. Si une copie existe déjà et qu'un autre texte est illisible : deux boutons, « Télécharger la copie » (texte de cette session) et « Télécharger l'ancienne copie » (`braise-v2-secours`), deux fichiers ; pour le jouer : `localStorage.setItem('braise-v2-secours','{ancienne'); localStorage.setItem('braise-v2','[actuel')` puis recharger.

## Recette appareil : PWA et mise à jour (procédure, non réalisée)

À jouer sur HTTPS (site Pages) avec appareils réels ; consigner chaque résultat dans `HANDOFF.md`.

1. **Android / Chrome** : ouvrir le site, jouer 1 minute, menu > « Installer l'application ». Lancer l'icône : plein écran, icône LPC correcte.
2. **iOS / Safari** : Partager > « Sur l'écran d'accueil », puis lancer l'icône. Vérifier l'icône (apple-touch-icon) et le démarrage.
3. **Mode avion** : après une première visite en ligne, activer le mode avion, fermer puis rouvrir l'app : le jeu charge, les sprites s'affichent, la partie reprend.
4. **Mise à jour avec partie en cours** : installer la version N, jouer quelques combats ; déployer N+1 (ou servir un `dist/` dont `CACHE` diffère). Rouvrir ou attendre : le bandeau « Nouvelle version de Braise disponible. » apparaît, les combats continuent. Noter l'or, cliquer « Recharger » : un seul rechargement, or et étage conservés.
5. **Bandeau** : atteignable à Tab, bouton ≥ 44 px, annoncé une fois au lecteur d'écran sans voler le focus, lisible à 360 px et avec Texte : Grand, sans animation avec le mouvement réduit.
6. **`braise-v2` intacte** : avant et après la mise à jour, comparer `localStorage.getItem('braise-v2')` (console distante) ; seuls les caches `braise-*` changent (`caches.keys()`).
7. **Ancien onglet** : avec deux onglets, laisser l'un sur l'ancien code après que l'autre a mis à jour : message de sauvegarde plus récente, aucune écriture.

## Résultats

Consigner dans `HANDOFF.md` le scénario joué, le viewport, les commandes passées et les vérifications non réalisées. Ne pas réutiliser une validation de la session précédente comme preuve d’une modification actuelle.
