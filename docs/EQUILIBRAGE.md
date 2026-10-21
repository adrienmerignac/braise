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
