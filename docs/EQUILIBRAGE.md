# Équilibrage — durée d'une expédition et progression sur plusieurs jours (M5.1)

Rapport de l'étape M5.1. Il constate ; il ne change aucune valeur du jeu. Le prestige (M5.2) n'est pas ajouté : ce rapport dit
d'abord si l'équilibrage actuel tient sans lui.

## Méthode

- **Outil** : `npm run simulate:jours -- 7` (`tools/simulate-jours.mjs`, Node 22, aucune dépendance). Il rejoue le moteur pur
  `dist/engine` avec une horloge virtuelle : 1 tick = `ATTACK_INTERVAL_MS` de temps de jeu, jamais le framerate. Butin tiré avec un
  générateur à graine : même graine, même résultat (`--graine=N`, 1 par défaut ; les chiffres ci-dessous sont ceux de la graine 1).
- **Une expédition** = la partie de la première minute jusqu'à la victoire sur le gardien de l'étage 15 (Gardien des cendres) : les
  trois zones sont ouvertes et leurs objectifs accessibles. Au-delà, les Cryptes n'ont pas de plafond d'étage.
- **Profil actif** : de 8 h à 24 h, 2 min de jeu toutes les 10 min (8 min d'absence entre deux), puis 8 h d'absence la nuit.
- **Profil occasionnel** : 3 sessions de 5 min (8 h, 13 h, 20 h) un jour sur deux, 2 (8 h, 20 h) l'autre.
- **Absences** : `offlineGains` tel que livré (plafond 8 h, seuil 60 s, facteur de combat 1,2, butin estimé sans épique).
- **Politique de jeu** (identique à la politique « patient » de `tools/simulate.mjs`) : achat de l'amélioration la moins chère, gardien
  lancé seulement s'il n'est pas « Mortel », voyage vers la zone ouverte, compétence dès qu'elle est prête ; en plus, talents dépensés
  dans l'ordre assaut, rempart, braise, fortune, et équipement de tout objet qui améliore l'emplacement.
- **Non simulé** : amélioration d'équipement, recyclage manuel, objectifs de zone (leur or est négligeable), décisions humaines.

## Résultats

| Profil | Jour | Meilleur étage | Niveau | Or gagné cumulé |
| --- | --- | --- | --- | --- |
| actif | 1 | 167 | 72 | 5,9 M |
| actif | 3 | 212 | 137 | 31 M |
| actif | 7 | 263 | 216 | 92 M |
| occasionnel | 1 | 45 | 79 | 1,8 M |
| occasionnel | 3 | 109 | 169 | 19 M |
| occasionnel | 7 | 219 | 258 | 78 M |

Jalons (minutes d'horloge depuis le début de partie ; gardien de l'étage N vaincu) :

| Profil | 5 | 10 | 15 | 20 | 50 | 100 |
| --- | --- | --- | --- | --- | --- | --- |
| actif | 10 | 12 | 22 | 40 | 111 | 282 |
| occasionnel | 2 | 5 | 301 | 302 | 1 442 | 3 602 |

Mêmes jalons en minutes de **temps de jeu** (compteur `jalonsJeuMinutes` : secondes de tick en session cumulées, absences exclues) :

| Profil | 5 | 10 | 15 | 20 | 50 | 100 |
| --- | --- | --- | --- | --- | --- | --- |
| actif | 2,1 | 3,7 | 5,7 | 8,1 | 23,1 | 58 |
| occasionnel | 2,3 | 4,7 | 6 | 7,1 | 16,7 | 36,5 |

Rythme de progression permanente, profil actif : 166 étages le jour 1, puis 24, 21, 12, 15, 14, 10 ; niveaux gagnés 71, 37, 28, 22, 21,
19, 17. Profil occasionnel : 44, 27, 37, 23, 34, 22, 31 étages ; niveaux gagnés 78, 41, 49, 20, 27, 23, 19.
Butin à 7 jours : actif 2 053 objets en ligne + 4 011 estimés hors ligne ; occasionnel 344 + 102. L'inventaire (24) est plein dès le
jour 1 ; trois emplacements équipés suffisent, le reste est converti en or.

## Constats

1. **Aucun mur, aucun softlock en 7 jours.** Les deux profils progressent tous les jours, jusqu'à 263 et 219 étages. Les Cryptes
   n'ont pas de fin : sans prestige, le jeu n'a pas de point d'arrivée, seulement un ralentissement.
2. **L'expédition est courte en temps de jeu, pour les trois profils.** Le gardien 15 tombe après 9 min de jeu continu
   (`tools/simulate.mjs`), 5,7 min de jeu en profil actif (22 min d'horloge : 3 sessions de 2 min) et 6 min en profil occasionnel
   (301 min d'horloge : 5 min de la première session, 1 min de la deuxième). L'absence **raccourcit** l'expédition au lieu de la
   rallonger : l'or et l'expérience gagnés hors ligne rendent le héros plus fort, donc le gardien tombe en moins de temps de jeu qu'en
   jeu continu. Les trois zones sont consommées avant que le joueur ait eu le temps de se poser des questions d'équipement ou de talents.
3. **Le premier jour s'emballe.** 166 étages en profil actif, 44 en occasionnel, contre 10 à 25 par jour ensuite.
4. **Le hors ligne domine.** Il fournit 67 % de l'or le jour 1 puis 75 à 77 % en profil actif, 94 à 97 % en occasionnel. Conséquence :
   à 7 jours, le profil occasionnel atteint 83 % de l'étage du profil actif (219 contre 263). Être présent est peu récompensé.
5. **Les achats plafonnent d'eux-mêmes.** Le coût croît de ×1,6 par niveau : avec un or par jour stable (13 à 18 M), chaque
   amélioration reste autour du niveau 28–29 (coût du suivant ≈ 20 M). La puissance vient ensuite des niveaux, qui ralentissent
   (35 × niveau d'expérience par niveau) : c'est ce qui produit la décélération du constat 3.
6. **Les défaites apparaissent tôt en actif** : 3 429 retraites en 7 jours (≈ 2,5 par minute de jeu en ligne) ; aucune hors ligne, car
   l'estimation d'absence ignore les défaites (règle connue). L'absence ne fait jamais avancer `stage` ni `meilleurEtage`
   (`docs/GAME_DESIGN.md:92`) : elle apporte or, expérience et butin sans retraite, et les étages se franchissent en session. Le
   joueur occasionnel monte donc pendant ses sessions, avec un héros que l'absence a rendu plus fort (constat 4).

## Durée cible d'une expédition

**Cible retenue : 20 à 30 min de temps de jeu pour atteindre le gardien de l'étage 15**, l'objectif déjà documenté
(`docs/GAME_DESIGN.md:103` : « un parcours intéressant de 20–30 minutes avant d'étendre la durée de vie »). Elle se mesure en **temps
de jeu** (session ouverte, héros qui combat), pas en temps d'horloge : les absences ne comptent pas, sinon un joueur qui revient
dans la journée paraîtrait plus lent sans avoir joué davantage. Le temps d'horloge reste relevé à titre indicatif. Pour le joueur
occasionnel, la même cible vaut en temps de jeu, répartie sur plusieurs sessions.

| Profil | Mesuré (temps de jeu) | Cible | Écart |
| --- | --- | --- | --- |
| continu | 9 min | 20 à 30 min | 2× à 3× trop court |
| actif | 5,7 min (22 min d'horloge) | 20 à 30 min | 3,5× à 5× trop court |
| occasionnel | 6 min (301 min d'horloge) | 20 à 30 min | 3,5× à 5× trop court |

Aucun profil n'atteint 20 à 30 min de jeu. L'écart est le plus grand pour les profils qui s'absentent : l'absence apporte or,
expérience et butin sans passer d'étage, donc le héros est déjà surdimensionné à chaque reprise. La cible est une valeur de départ, à confirmer par les premiers retours de
joueurs (`docs/BETA.md`).

## Réglage

**Aucune valeur modifiée dans cette étape.** Le rythme du jour 1 est la conséquence de plusieurs constantes liées (`ENEMY_HP_PER_STAGE`,
`COST_GROWTH`, `XP_PER_LEVEL`, `OFFLINE_FIGHT_FACTOR`), chaque test d'équilibrage en fixe des instantanés, et la roadmap interdit de
masquer un équilibrage insuffisant par le prestige. Pistes réversibles, à essayer une par une avec ce script avant de les retenir :

1. `OFFLINE_FIGHT_FACTOR` 1,2 → 0,6 : réduit la part du hors ligne et l'avance qu'il donne (constats 2 et 4) ; ne touche ni la sauvegarde ni les coûts.
2. `ENEMY_HP_PER_STAGE` 14 → 20 : ralentit l'ascension du jour 1 (constats 2 et 3).
3. `COST_GROWTH` 1,6 → 1,5 : relâche le plafond d'achats (constat 5) ; à ne faire qu'avec le point 2.

Aucune n'altère le schéma de sauvegarde : pas de migration. Chaque essai se mesure en relançant `npm run simulate:jours -- 7` et
en mettant à jour les instantanés de `tests/engine/equilibrage.test.mjs`.

## Essai piste 1

Sens de la constante : `offline.js` calcule `victoires = absence / (coups par victoire × OFFLINE_FIGHT_FACTOR)`. **Baisser** le facteur
(1,2 → 0,6) aurait *augmenté* les gains d'absence ; l'essai **monte** donc le facteur de 1,2 à **2,4** (gains d'absence divisés par deux : or,
expérience et butin estimé). Plafond 8 h, seuil 60 s, schéma `braise-v2` v7 : inchangés, aucune migration. Relevé : `npm run simulate:jours -- 7`
(graine 1) et `node tools/simulate.mjs` (identique avant/après : il ne joue pas d'absence).

| profil · mesure | avant (1,2) | après (2,4) |
| --- | --- | --- |
| actif · part d'or hors ligne | 76,6 % | 63,3 % |
| actif · minutes de jeu au gardien 15 | 5,7 | 6,5 |
| actif · meilleur étage jour 7 | 263 | 237 |
| occasionnel · part d'or hors ligne | 97,5 % | 94,9 % |
| occasionnel · minutes de jeu au gardien 15 | 6,0 | 6,2 |
| occasionnel · meilleur étage jour 7 | 219 | 192 |

Lecture : l'absence avance moins le héros (niveau 216 → 161 en actif au jour 7) et l'expédition s'allonge (gardien 100 : 58 → 135 min de jeu en
actif, 36,5 → 40,5 en occasionnel). Le gardien 15 reste à 6 à 6,5 min de jeu, loin de la cible de 20 à 30 min : la piste 2
(`ENEMY_HP_PER_STAGE`) reste nécessaire. L'occasionnel tire encore 95 % de son or de l'absence : cette piste seule n'y change presque rien.

## Essai piste 2

Issue #131. Relevés : `node tools/simulate.mjs 60 --farm` (jeu continu, politique patiente, graine 1) et `npm run simulate:jours -- 7`.
« Mur » = gardien « Mortel » plus de 5 min d'affilée en politique patiente avant le gardien 15. Valeur de départ `ENEMY_HP_PER_STAGE` 14 → 20,
puis pas de 4, la piste 3 (`COST_GROWTH` 1,6 → 1,5) n'étant appliquée qu'à partir du premier mur.

**Premier passage** (`ENEMY_BASE_HP` 32, inchangé) :

| `ENEMY_HP_PER_STAGE` · `COST_GROWTH` | gardien 15, jeu continu patient | plus long « Mortel » | 1er gardien |
| --- | --- | --- | --- |
| 14 · 1,6 (avant) | 9,2 min | aucun | 35 s |
| 20 · 1,6 | 12,2 min | 14 s | 52 s |
| 24 · 1,6 | 16,1 min | 114 s | 60 s |
| 28 · 1,6 | 23,2 min | **373 s : mur** | 61 s |
| 32 · 1,6 | 28,6 min | 341 s : mur | 73 s |
| 28 · 1,5 | 14,1 min | 14 s | 54 s |
| 32 · 1,5 | 18,0 min | 127 s | 73 s |
| 36 · 1,5 | 23,8 min | 265 s | **79 s** (et politique fixe : jamais battu) |

Écart relevé en revue : le premier gardien dépassait 60 s, car la base fixe pèse seule sur l'étage 1. Seconde variable essayée :
`ENEMY_BASE_HP` (PV du début) abaissée pour que l'étage 1 retrouve ses anciens PV, à `COST_GROWTH` 1,5.

**Second passage** (`COST_GROWTH` 1,5) :

| `ENEMY_BASE_HP` · `ENEMY_HP_PER_STAGE` | gardien 15 patient | plus long « Mortel » | 1er gardien patient · fixe |
| --- | --- | --- | --- |
| 10 · 36 | 19,3 min | 118 s | 35 s · 35 s |
| 10 · 38 | 23,1 min | 247 s | 43 s · 36 s |
| 10 · 40 | 25,4 min | 294 s | 48 s · 42 s |
| 10 · 42 | 32,5 min | 428 s : mur | 48 s · 43 s |
| 8 · 38 | 23,3 min | 247 s | 35 s · 35 s |
| 8 · 40 | 25,1 min | 294 s | 43 s · 36 s |

**Valeurs retenues : `ENEMY_BASE_HP` 8, `ENEMY_HP_PER_STAGE` 38, `COST_GROWTH` 1,5.** Étage 1 : (8 + 38) = 46 PV, gardien 230 : exactement les
anciens PV, donc premier achat (7,2 s) et premier gardien (34,8 s, politique fixe comme patiente) inchangés. Étage 15 : 578 PV contre 572
(+1 %). Le pas de 36 reste sous 20 min ; 40 laisse un « Mortel » de 294 s, au ras du seuil de 300 s. `ENEMY_BASE_HP` sort du libellé de
l'issue #131 (qui ne citait que le pas par étage) : il est ajusté ici sur demande de la revue, pour tenir le premier gardien à 60 s au plus.
Plafond 8 h, seuil d'absence, schéma v7 : inchangés ; aucune migration (une partie enregistrée avec les anciens PV d'ennemi reste acceptée :
`save.js` borne `enemyHP` par le maximum de base ou du gardien, tous deux plus hauts, puis par le maximum du type).

Avant / après (graine 1) :

| mesure | avant | après |
| --- | --- | --- |
| gardien 15 · jeu continu patient | 9,2 min | **23,3 min** |
| gardien 15 · jeu continu, politique fixe | 9,2 min | 18,0 min |
| gardien 15 · profil actif (temps de jeu) | 6,5 min | 10,3 min |
| gardien 15 · profil occasionnel (temps de jeu) | 6,2 min | 9,1 min |
| 1er achat · 1er gardien (patient et fixe) | 7,2 s · 34,8 s | 7,2 s · 34,8 s |
| plus long « Mortel » avant le gardien 15 | aucun | 247 s |
| meilleur étage au jour 7 · actif / occasionnel | 237 / 192 | 130 / 107 |

**Verdict : cible tenue en jeu continu patient (23,3 min), non tenue pour les deux profils à sessions** (10,3 et 9,1 min de jeu) : leurs
sessions courtes profitent de l'or d'absence, qui rend le héros plus fort. Monter encore le pas ferait dépasser 30 min au jeu continu
patient et buter sur un mur ; il faudrait plutôt réduire de nouveau l'absence (piste 1) : à décider dans une issue dédiée.

## Conclusion

**Sans prestige, l'équilibrage tient techniquement sur 7 jours** (pas de mur, pas de valeur infinie, progression quotidienne), **mais
il ne tient qu'à moitié comme jeu** : en temps de jeu, aucun profil n'atteint la cible de 20 à 30 min (9 min en continu, 5,7 en actif,
6 en occasionnel), et l'absence raccourcit l'expédition au lieu de la rallonger. De plus, passé le jour 1, la progression ne fait plus que ralentir
en étages sans fin. Le prestige ne devra pas masquer cela : régler d'abord le rythme des premiers étages (pistes 1 et 2).

Paliers à surveiller :
- **Étages 15 → 20** (5,7 à 8,1 min de jeu en actif) : fin du contenu écrit, point où le joueur occasionnel décroche.
- **Étages 50 → 100** : les retraites deviennent la norme en ligne ; l'absence n'en subit aucune mais n'avance pas les étages, qui se franchissent en session.
- **Jour 1 → jour 2** : de 166 à 24 étages par jour en actif ; rupture de rythme la plus visible.
- **Niveau d'amélioration ≈ 28–29** : l'or n'achète plus rien d'utile ; seul le niveau (expérience) progresse.
- **Part du hors ligne > 90 %** (occasionnel) : la présence ne compte plus.

## Garde-fous testés

`tests/engine/simulation-jours.test.mjs` : simulation déterministe (même graine, même résultat) ; 10 min de `dist/game.js` jouées en
un bloc, en pas de 1 s ou de 16 ms donnent la même sauvegarde ; cette sauvegarde est celle du moteur à raison d'un coup par
`ATTACK_INTERVAL_MS`.

## Essai piste 1 bis

Issue #148. Reprise du point laissé ouvert par la piste 2 : les profils actif (10,3 min de jeu au gardien 15) et occasionnel (9,1 min) restent loin de
la cible de 20 à 30 min, parce que l'or d'absence les renforce. L'essai **monte** `OFFLINE_FIGHT_FACTOR` (2,4 → 3,6 → 4,8 → 6) : moins de gains d'absence.
Plafond 8 h, seuil 60 s, schéma v10 : inchangés, aucune migration. Relevés (graine 1) : `npm run simulate:jours -- 7` et `node tools/simulate.mjs 60 --farm`.
Dernière colonne : or rapporté par 8 h d'absence au retour à l'étage 15 (héros niveau 10 au gardien 15, jeu patient), en prix de la plus
petite amélioration (2 075 or).

| facteur | actif · min de jeu gardien 15 | occasionnel · min de jeu gardien 15 | actif · or hors ligne | occasionnel · or hors ligne | meilleur étage j7 (actif · occ.) | 8 h à l'étage 15 |
| --- | --- | --- | --- | --- | --- | --- |
| 2,4 (avant) | 10,3 | 9,1 | 9,78 M | 8,95 M | 130 · 107 | 71 131 or (34,3 prix) |
| 3,6 | 10,8 | 9,7 | 6,70 M | 5,54 M | 121 · 101 | 47 393 or (22,8 prix) |
| 4,8 (retenu) | 11,4 | 10,0 | 4,74 M | 3,15 M | 117 · 90 | 35 524 or (17,1 prix) |
| 6 | 11,6 | 10,0 | 3,79 M | 2,68 M | 112 · 88 | 28 386 or (13,7 prix) |

`node tools/simulate.mjs 60 --farm` ne bouge pas (gardien 15 à 1 399,2 s, étage 20, 39 achats à chaque palier) : il ne joue pas d'absence.

**Règle de décision** : on retient la plus petite valeur qui amène les profils actif **et** occasionnel à au moins 20 min de jeu au gardien 15, à
condition que, à 8 h d'absence, le retour au niveau de l'étage 15 rapporte encore au moins le prix d'une amélioration. Si aucun palier jusqu'à 6
n'y parvient, on retient 4,8.

**Verdict : cible non tenue pour les profils à sessions.** Aucun palier n'atteint 20 min (11,6 min au mieux en actif, 10,0 en occasionnel à 6) : le
gardien 15 tombe dans les dix premières minutes de jeu, et l'absence ne pèse presque pas sur cette étape. L'occasionnel y arrive après la première
absence de 5 h seulement, avec un héros déjà au niveau 10 ; l'or hors ligne ne fait que prolonger les étages suivants (étage 90 au jour 7 contre 107). Le
levier restant est donc dans le rythme de jeu en session (PV des ennemis, coût des améliorations), pas dans l'absence. **Retenu : 4,8.** La
condition de 8 h tient (17,1 prix d'amélioration au retour à l'étage 15).

## Rallumage (M5.2)

Issue #157, critère de sortie de M5 : « une deuxième expédition change les décisions ». Mesure du rallumage livré (M5.2a/b), **sans changer
aucune valeur**. Relevés : `node tools/simulate-jours.mjs 7 --profil=<actif|occasionnel> --graine=1 --rallumage=<étage>`. Politique : rallumer dès que
`meilleurEtage` dépasse l'étage donné, via `rallumer(..., { confirme: true })` du moteur. Les minutes sont du **temps de jeu** jusqu'au gardien 15 de
chaque expédition ; la colonne « 2e/1re » est le rapport des deux. Sans l'option, la sortie du script est inchangée.

| profil · seuil | rallumages | éclats | gardien 15 : 1re / 2e / 3e expédition (min) | 2e/1re | record j7 | or hors ligne |
| --- | --- | --- | --- | --- | --- | --- |
| actif · 20 | 485 | 970 | 11,4 / 9,7 / 8,9 | 85 % | 21 | 37,1 % |
| actif · 30 | 322 | 1 288 | 11,4 / 9,2 / 7,8 | 81 % | 31 | 36,9 % |
| actif · 50 | 174 | 1 392 | 11,4 / 7,8 / 6,5 | 68 % | 51 | 39,5 % |
| occasionnel · 20 | 10 | 20 | 10,0 / 5,7 / 6,6 | 57 % | 21 | 85,5 % |
| occasionnel · 30 | 6 | 24 | 10,0 / 7,4 / 6,3 | 74 % | 31 | 87,7 % |
| occasionnel · 50 | 3 | 24 | 10,0 / 5,3 / 4,0 | 53 % | 51 | 87,2 % |

**Lecture.**
- **Le record plafonne au seuil.** Rallumer dès que l'étage dépasse N interdit d'aller plus loin : le « record j7 » vaut N + 1 par construction. Sans
  rallumage (voir plus haut), le jour 7 monte à 130 (actif) et 107 (occasionnel) : cette politique échange la profondeur contre la vitesse, ce qui n'est
  pas la même décision qu'une vraie 2e expédition.
- **Le gain vient surtout de la 2e expédition.** Les suivantes gagnent peu de minutes en occasionnel (la 3e est parfois plus lente que la 2e : 5,7 → 6,6 min
  à 20) ; en actif, les éclats s'accumulent (jusqu'à 1 392) et les expéditions tombent sous 2 min de jeu, soit très loin de la cible de 20 à 30 min.
- **Le profil actif rallume des centaines de fois** en 7 jours (une expédition toutes les ~20 min d'horloge au seuil 20) : la politique est une borne
  haute du joueur patient, pas un comportement attendu. L'occasionnel rallume 3 à 10 fois, avec 85 à 88 % de son or venu de l'absence.
- Au seuil 50, l'occasionnel ne rallume que 3 fois en 7 jours : atteindre l'étage 51 lui demande des jours entiers d'absence.

**Règle** : la 2e expédition doit atteindre le gardien 15 en **40 % à 80 %** du temps de jeu de la 1re.

**Verdict : tenue en partie.** Les 4 cas **occasionnel** (57, 74, 53 %) et **actif · 50** (68 %) sont dans la fourchette. **Actif · 20 (85 %) et actif · 30
(81 %) sont au-dessus de 80 %** : la 2e expédition n'est alors pas assez plus courte pour récompenser un rallumage précoce. Aucun cas ne tombe sous 40 %
(rallumage « sauté » : non). La constante à essayer est `RALLUMAGE_BONUS` (à la hausse, pour que les premiers éclats pèsent davantage) ; `RALLUMAGE_PAS`
(à la baisse, pour gagner des éclats dès les premiers étages) agit sur le même cas. Rien n'est modifié ici : l'essai est renvoyé à une issue dédiée, avec
cette même règle de décision et en vérifiant que le profil actif · 50 reste sous 80 % et au-dessus de 40 %.

### Essai bonus de rallumage

Issue #161 : suite du verdict ci-dessus. Seul `RALLUMAGE_BONUS` (`dist/engine/balance.js`) change d'un palier à l'autre ; `RALLUMAGE_PAS = 5` et
`RALLUMAGE_DECALAGE = 2` restent. Plafond 8 h, `OFFLINE_FIGHT_FACTOR`, PV des ennemis et coûts sont inchangés. Mêmes relevés que plus haut :
`node tools/simulate-jours.mjs 7 --profil=<actif|occasionnel> --graine=1 --rallumage=<20|30|50>`. Chaque cellule : minutes de jeu au gardien 15
(1re / 2e / 3e expédition), puis « 2e/1re ». Le palier 0,05 est la valeur d'avant (les 6 cas reprennent le tableau ci-dessus).

| profil · seuil | 0,05 (avant) | 0,075 | 0,10 | 0,15 |
| --- | --- | --- | --- | --- |
| actif · 20 | 11,4 / 9,7 / 8,9 · **85 %** | 11,4 / 9,1 / 9,0 · 80 % | 11,4 / 8,9 / 8,0 · 78 % | 11,4 / 7,9 / 7,5 · 69 % |
| actif · 30 | 11,4 / 9,2 / 7,8 · **81 %** | 11,4 / 8,6 / 6,9 · 75 % | 11,4 / 8,1 / 6,0 · 71 % | 11,4 / 7,3 / 5,1 · 64 % |
| actif · 50 | 11,4 / 7,8 / 6,5 · 68 % | 11,4 / 7,1 / 5,0 · 62 % | 11,4 / 6,0 / 4,8 · 53 % | 11,4 / 5,1 / 3,4 · 45 % |
| occasionnel · 20 | 10,0 / 5,7 / 6,6 · 57 % | 10,0 / 5,5 / 6,9 · 55 % | 10,0 / 5,5 / 6,7 · 55 % | 10,0 / 5,5 / 6,2 · 55 % |
| occasionnel · 30 | 10,0 / 7,4 / 6,3 · 74 % | 10,0 / 7,5 / 5,1 · 75 % | 10,0 / 7,1 / 5,4 · 71 % | 10,0 / 6,5 / 3,2 · 65 % |
| occasionnel · 50 | 10,0 / 5,3 / 4,0 · 53 % | 10,0 / 4,7 / 4,9 · 47 % | 10,0 / 4,3 / 3,0 · 43 % | 10,0 / 3,7 / 4,1 · **37 %** |
| cas dans 40–80 % | 4 / 6 | **6 / 6** | 6 / 6 | 5 / 6 |

En gras : les cas hors fourchette. Rallumages et éclats augmentent un peu avec le bonus (actif · 20 : 485 → 521 rallumages à 0,075) ; la part d'or
hors ligne reste dans les mêmes eaux (actif 36 à 40 %, occasionnel 82 à 89 %).

**Règle de décision** : retenir le plus petit changement (bonus d'abord, puis pas) qui met **les 6 cas** entre 40 % et 80 % (colonne « 2e/1re »). Si aucun
palier n'y parvient, retenir celui qui met le plus de cas dans la fourchette sans en faire tomber aucun sous 40 %. En cas d'égalité, prendre la plus petite
valeur.

**Verdict : tenue.** 0,075 est le plus petit palier du bonus qui met les 6 cas dans la fourchette. Le palier 0,15 fait tomber occasionnel · 50 à 37 %
(sous 40 %). La baisse de `RALLUMAGE_PAS` n'a pas été essayée : la règle ne la demande que si aucun palier du bonus ne convient.

**Valeur retenue : `RALLUMAGE_BONUS = 0.075`** (+7,5 % d'attaque, de vie max et d'or par éclat). Marge faible : actif · 20 vaut 9,1 / 11,4 = 79,8 %, soit 80 %
arrondi, tout juste dans la fourchette ; occasionnel · 50 est à 47 %. Les 6 relevés sont une seule graine (`--graine=1`). Le panneau Carte lit les mêmes
constantes, et son pourcentage s'affiche désormais avec une décimale (« +22,5 % ») puisque 7,5 % × éclats donne des demi-points. Aucune migration : les éclats
sont stockés, le bonus en est dérivé ; une partie v12 avec éclats est reprise avec le nouveau bonus.
