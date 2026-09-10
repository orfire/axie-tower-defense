# Axie Tower Defense — Game Design Document v1.0

> Statut : **brouillon à valider**. Rédigé le 03/09/2026 pour l'Axie Vibeathon, round 1 (livrable jouable le 21/09/2026).
> Complète et remplace la matrice v0.1 (`design/MATRICE.md`) là où les deux divergent.
> Tout chiffre de ce document est une valeur de départ, destinée à `balance.json`.

---

## 0. Mode d'emploi

Ce document est **la source de vérité** du jeu. Il est écrit pour être repris seul, dans une nouvelle conversation, sans le contexte des échanges qui l'ont produit.

- **Ordre de lecture pour reprendre le projet** : §2 (décisions), §4 (plateau), §5 et §6 (classes et statuts), §8 (économie), §10 (niveaux), §18 (planning). Le reste se consulte au besoin.
- **En cas de conflit** entre ce document et `design/MATRICE.md`, ce document gagne. En cas de conflit avec `CLAUDE.md`, `CLAUDE.md` décrit l'état d'avancement, ce document décrit le jeu.
- **Toute modification de règle** se fait ici d'abord, jamais dans le code seul. Les chiffres vivent dans `balance.json`, les règles vivent ici.
- **Statut de chaque section** : validé par Edouard sauf mention « à ajuster » ou « proposition ».

### Glossaire

| Terme | Définition |
|---|---|
| **Axie** | Unité du joueur. Une classe, un profil, jamais de niveau |
| **Chimère** | Ennemi. Une classe pour le triangle, un comportement |
| **Classe** | Bête, Aquatique, Plante, Oiseau, Insecte, Reptile. Fixe attaque, statut, aura, coût, ligne |
| **Ligne** | Mêlée (peut bloquer sur le chemin) ou Distance (plaine et colline) |
| **Profil** | Résumé des 6 parts : DPS, Rapide, Tank, Hybride. Ajuste les stats, rien d'autre |
| **Part** | Une des 6 parties du corps. Chaque part a une classe qui donne un bonus de stat |
| **Chemin** | Cases que suivent les chimères. Un Axie mêlée posé dessus bloque |
| **Plaine** | Case hors chemin. Toute classe. Reçoit et donne les auras |
| **Colline** | Case rare, distance uniquement, intouchable sauf par les dryades, portée −1, aucune aura |
| **Bloqueur** | Axie mêlée sur le chemin. Les chimères s'arrêtent et le frappent |
| **Aura** | Effet permanent d'une classe sur ses 4 voisins orthogonaux, ou sur les ennemis de ces cases |
| **Anti-empilement** | Deux voisins de même classe ne donnent qu'une aura |
| **Statut** | Effet temporaire sur un ennemi, posé par une attaque |
| **Réaction en chaîne** | Effet spécial quand une attaque touche une cible sous un certain statut |
| **Budget** | Énergie disponible pour une vague, entièrement recyclée à chaque phase de placement |
| **Vague** | Liste fixe de spawns avec leur temps. Aucun aléa |
| **PV du niveau** | 3. Chaque chimère sortie en retire. Étoiles = PV restants |
| **Draft** | Les 5 Axies choisis pour un niveau |
| **KO** | Axie à 0 PV, retiré jusqu'à la fin de la vague, revient gratuitement |

---

## 1. Pitch

Tower defense mobile portrait où le joueur défend un chemin avec ses Axies contre des vagues de chimères. Aucun Axie ne monte de niveau. On gagne en choisissant **quelles classes** poser et **à côté de qui**, parce que chaque classe projette une aura sur ses voisins et que les statuts se répondent en chaîne.

**Positionnement** : un puzzle de placement à budget, lisible en 3 minutes, rejouable jusqu'aux 3 étoiles.

**Lien avec le thème « Axie Core »** (35 % de la note). Le jeu s'appuie sur deux angles listés par l'organisateur : les **traits** et les **relations**. La classe et les 6 parts d'un Axie déterminent ce qu'il fait sur le plateau, sans niveau ni équipement. Les auras d'adjacence font que la valeur d'un Axie dépend de qui l'entoure : un Axie seul est faible, une équipe bien disposée est forte. Les ennemis sont les chimères de Lunacia. En round 2, les parts réelles des Axies du joueur, lues via l'API Sky Mavis, alimentent directement le système de profil.

---

## 2. Décisions structurantes (actées le 03/09)

| # | Décision | Choix |
|---|---|---|
| A | Progression | **Campagne linéaire de 8 niveaux faits main**, extensible |
| B | Session | **Format court, 3 à 5 min**, nombre de vagues croissant (5 → 9) |
| C | Phase de placement | **Sans limite de temps**, lancement manuel de chaque vague |
| D | Économie | **Budget d'énergie fixé par vague, recyclable**, coût par classe. Repli : slots simples |
| E | Défaite | **3 PV par niveau**, cumulés sur toutes les vagues. Étoiles selon les fuites |
| F | Axies | **Classe + profil**. La classe fixe attaque, statut, aura. Le profil dérive des parts et ajuste les stats |
| G | Collection v1 | **20 Axies de base du toolkit**, 6 disponibles au départ, 13 à débloquer aux étoiles, Dusk réservé |
| H | Plateau | **8 × 13 sans zoom** (révisé le 10/09, était 7 × 10), aimantation. **Mêlée sur le chemin = bloqueur**, distance en plaine. Pas de plafond de bloqueurs |
| I | Colline | 1 ou 2 cases par niveau, distance uniquement, intouchable sauf par les dryades. Prix : **portée −1, aucune aura** |

Rappel des décisions antérieures (`CLAUDE.md` §3) : triangle de classes ±15 %, auras d'adjacence, anti-empilement, chimères en ennemis, repositionnement gratuit, vagues déterministes, draft de 5, rendu 2D, pas de wallet.

---

## 3. Boucle de jeu

### 3.1 Macro-boucle

```
Carte de campagne → Fiche du niveau (chemin + chimères annoncées)
  → Draft de 5 Axies parmi la collection
  → Niveau : [placement → vague] × N
  → Écran de fin : étoiles, Axie(s) débloqué(s)
  → Retour carte
```

### 3.2 Boucle d'un niveau

1. **Placement** : le joueur voit le budget de la vague à venir, la composition annoncée (icônes des chimères, ordre d'arrivée), le plateau. Il pose, déplace ou retire librement ses Axies. Aucune limite de temps.
2. **Lancement** : bouton « Lancer la vague ». Plus aucune action sur le plateau jusqu'à la fin de la vague.
3. **Vague** : temps réel, 20 à 40 secondes. Bouton vitesse ×2 disponible.
4. **Fin de vague** : les ennemis sont tous morts ou sortis. Les Axies KO reviennent. Retour à 1 avec le budget de la vague suivante.
5. **Fin de niveau** : après la dernière vague, écran de résultat.
6. **Défaite** : à 0 PV, écran de défaite, bouton « Réessayer » qui relance à la vague 1 avec le draft conservé. Les vagues sont identiques.

### 3.3 Ce que le joueur apprend niveau après niveau

Le jeu ne s'explique pas, il se découvre. Chaque niveau est construit pour qu'une **nouvelle interaction** soit la clé, et pour qu'**au moins deux compositions** différentes le finissent à 3 étoiles.

---

## 4. Plateau et règles spatiales

- **Grille 8 colonnes × 13 lignes**, portrait, sans zoom. Une case = une unité de distance. Révisée le 10/09 : en 7 × 10, la largeur ne laissait qu'un tracé possible, le serpentin, et cinq niveaux sur huit étaient le même plan.
- **Chemin fixe** par niveau, tracé sur des cases de la grille. Entrée en haut, sortie en bas. Longueur de 18 à 30 cases. **En révision le 10/09** : les tracés 8 × 13 (`design/traces-8x13.html`) proposent entrée et sortie sur n'importe quel bord et des segments verticaux plus longs, en attente de validation.
- **Les chemins privilégient les segments horizontaux** : les sprites Spine sont vus de profil, ils marchent naturellement vers la gauche ou la droite et se retournent aux virages. Les segments verticaux restent courts, 1 à 3 cases. Un serpentin, pas une descente.
- Trois types de cases pour les Axies. Une case = un Axie.
  - **Case de chemin** : réservée aux classes **mêlée** (Plante, Bête, Insecte). L'Axie y **bloque** : les chimères s'arrêtent devant lui et le frappent jusqu'à le mettre KO. Pas de plafond au nombre de bloqueurs, le budget suffit.
  - **Case de plaine** (hors chemin) : ouverte à toutes les classes. C'est la seconde ligne. Exposée aux tireurs ennemis, jamais à la mêlée.
  - **Case de colline** : dessinée par le niveau, **1 ou 2 par niveau au maximum**, jamais orthogonalement adjacente au chemin (la diagonale est permise). Classes **distance** uniquement. L'Axie y est **intouchable**, sauf par `dryad-ranger` et `dryad-mage`. En contrepartie, sa **portée est réduite de 1 case** et il **ne reçoit ni ne donne aucune aura**, même avec un voisin. La colline est un abri, pas un poste de tir.
- Deux lignes de défense, donc : le front sur le chemin qui achète du temps, l'arrière qui tue. Les auras traversent chemin et plaine, l'adjacence reste orthogonale.
- **Portée** : distance euclidienne entre le centre de la case de l'Axie et le centre de la case de l'ennemi, en cases. Portée 1 = les 4 cases orthogonales, portée 1.5 = les 8 cases autour, portée 2.5 = un cercle de rayon 2.5.
- **Adjacence (auras)** : les **4 cases orthogonales** uniquement. Les diagonales ne comptent pas. Ce choix rend le quinconce intéressant : deux Axies en diagonale ne partagent rien.
- **Ciblage par défaut** : l'ennemi **le plus avancé** sur le chemin parmi ceux à portée. Une cible marquée « Plume » est prioritaire.

---

## 5. Les 6 classes

### 5.1 Table de référence (profil neutre, coût par classe)

| Classe | Ligne | Coût | PV | Dégâts | Cadence | Portée | Attaque (VFX) | Statut posé | Aura sur les 4 voisins |
|---|---|---|---|---|---|---|---|---|---|
| **Bête** | Mêlée | 3 | 120 | 40 | 0,6/s | 1,5 | `beast_smash` | Rage (sur soi) | **Fureur** : voisins +30 % dégâts sur les cibles sous 50 % PV |
| **Aquatique** | Distance | 1 | 60 | 8 | 1,2/s | 2,5 | `aquatic_projectile` | Trempé | **Marée** : les cibles touchées par un voisin deviennent Trempées |
| **Plante** | Mêlée | 2 | 200 | 12 | 0,8/s | 1 | `plant_gore` | — | **Racines** : ennemis sur les cases adjacentes −40 % vitesse |
| **Oiseau** | Distance | 1 | 50 | 10 | 2,0/s | 3,5 | `bird_projectile` | Plume (marque) | **Vent** : voisins +1 case de portée |
| **Insecte** | Mêlée | 2 | 80 | 6 | 1,0/s | 1,5 | `bug_bite` | Poison, puis Saignement | **Essaim** : les DoT posés par les voisins tickent 2× plus vite |
| **Reptile** | Distance | 2 | 90 | 15 | 0,8/s | 2,5 | `reptile_cast` | Fragile | **Écailles** : ennemis sur les cases adjacentes −15 points d'armure |

Notes de lecture :

- **Mêlée** : peut se poser sur le chemin (bloqueur) ou en plaine. **Distance** : plaine uniquement.
- Insecte et Poison **ignorent l'armure**.
- Plante n'attaque que les ennemis sur ses 4 cases adjacentes. C'est le bloqueur de référence : 200 PV et Racines sur les ennemis qu'elle retient.
- Bête frappe fort et lentement. Sans support, elle rate le tempo des vagues rapides.
- Aquatique et Oiseau coûtent 1 : ce sont les pièces de remplissage qui rendent le budget flexible.

### 5.2 Triangle de classes

```
Bête / Insecte      →  ×1,15 contre  →  Plante / Reptile
Plante / Reptile    →  ×1,15 contre  →  Aquatique / Oiseau
Aquatique / Oiseau  →  ×1,15 contre  →  Bête / Insecte
```

Le sens inverse donne ×0,85. Neutre sinon. Mech, Dawn, Dusk suivent le canon Axie mais sont hors v1.

S'applique à la classe de l'ennemi (chaque chimère a une classe, §7) et aux attaques des chimères sur les Axies.

### 5.3 Anti-empilement

Un Axie qui a **deux voisins de même classe** ne reçoit **qu'une seule** instance de cette aura, la plus forte selon le profil. Deux auras de classes différentes se cumulent. Pour les auras sur ennemis (Racines, Écailles), un ennemi adjacent à deux Plantes ne subit qu'un seul ralentissement.

Conséquence voulue : une ligne de 5 Bêtes est une mauvaise idée, une alternance Bête / Reptile / Bête en est une bonne.

---

## 6. Statuts et réactions en chaîne

### 6.1 Définitions précises

| Statut | Posé par | Durée | Effet | VFX |
|---|---|---|---|---|
| **Trempé** | Attaque Aquatique, aura Marée | 4 s | +20 % dégâts subis | `bubble` |
| **Racines** | Aura Plante | Tant que sur une case adjacente | −40 % vitesse | `leaf` |
| **Bloqué** | Tout Axie mêlée posé sur le chemin | Tant que le bloqueur est debout | L'ennemi s'arrête sur la case précédente et frappe le bloqueur. Les suivants font la queue derrière | `taunt` sur le bloqueur |
| **Plume** | Attaque Oiseau | 3 s | La cible devient prioritaire pour tous les Axies qui l'ont à portée | `feather` |
| **Poison** | Attaque Insecte | 4 s | 4 dégâts/s, ignore l'armure. Réappliqué à chaque coup, la durée se rafraîchit | `poison_apply` |
| **Saignement** | Attaque Insecte sur une cible déjà empoisonnée | 3 s | 6 dégâts/s | `bleed_apply` |
| **Fragile** | Attaque Reptile | 5 s | Armure divisée par 2 | `fragile` |
| **Rage** | Bête, sur elle-même, à chaque kill | Jusqu'à la fin de la vague | +10 % cadence par charge, 5 charges max | `rage` |

### 6.2 Réactions en chaîne

Ce sont **les** mécaniques à découvrir. Aucune n'est expliquée par un texte, chacune a un VFX distinct.

| Déclencheur | Réaction | Effet |
|---|---|---|
| Oiseau touche une cible **Trempée** | **Ricochet** | Le projectile rebondit sur jusqu'à 2 ennemis dans un rayon de 1,5 case, 50 % des dégâts. Les cibles du rebond sont Trempées à leur tour si l'Oiseau a un voisin Aquatique |
| Insecte touche une cible sous **Racines** | **Enracinement** | Poison et Saignement durent 2× plus longtemps |
| Bête touche une cible **Fragile** | **Brisure** | Coup critique garanti, dégâts ×2. Seule source de critique du jeu |
| Bête tue une cible qui **Saigne** | **Éclatement** | Explosion de 30 dégâts sur les ennemis dans un rayon de 1 case |
| Un bloqueur retient un groupe | **Regroupement** | Les ennemis font la queue sur les cases précédentes : prépare le Ricochet et l'Éclatement |

**Aucun aléa** dans le combat. Pas de critique aléatoire, pas d'esquive, pas de variance de dégâts. Deux parties identiques donnent le même résultat à la frame près.

### 6.3 Combos cibles

| Nom | Composition | Réponse à | Niveau où elle brille |
|---|---|---|---|
| **Orage** | Aquatique entouré de 2 Oiseaux | Vagues denses et fragiles | 1, 2, 7 |
| **Marécage** | Plante entourée de 2 Insectes | Ennemis lents et tanky | 2, 5 |
| **Exécution** | Reptile + Bête + Insecte alignés | Boss et élites | 5, 7, 8 |
| **Digue** | 2 Plantes en quinconce, Oiseau au centre | Vagues rapides | 3, 4 |
| **Nettoyeur** | Insecte + Bête | Vagues nombreuses à faibles PV | 1, 6 |
| **Rempart** | Plante sur le chemin, Reptile et Oiseau en plaine derrière | Ennemis à distance | 6 |
| **Étau** | Deux bloqueurs à 3 cases d'écart, Aquatique + Oiseau entre les deux | Meutes rapides | 3, 7 |

---

## 7. Les chimères

Toutes proviennent du toolkit 2D (Spine 3.8.79, animations `move-forward`, `hit-by-normal`, `hit-die`, `normal-attack`). Chaque chimère a une classe pour le triangle.

### 7.1 Roster v1

La colonne **Mêlée** donne les dégâts par seconde infligés à un bloqueur qui retient la chimère.

| Chimère | Classe | PV | Vitesse (cases/s) | Armure | Mêlée | Comportement |
|---|---|---|---|---|---|---|
| `slime` | Plante | 40 | 1,0 | 0 % | 4/s | Basique, nombreux |
| `slime-forest-a` | Plante | 60 | 1,0 | 0 % | 5/s | Variante PV |
| `slime-forest-b` | Plante | 30 | 1,4 | 0 % | 3/s | Variante rapide |
| `slime-attack` | Aquatique | 50 | 1,0 | 0 % | 6/s | **Tir** : projectile sur l'Axie le plus proche à 2 cases, toutes les 2 s, 10 dégâts |
| `slime-defense` | Aquatique | 90 | 0,8 | 30 % | 4/s | Blindé |
| `slime-support` | Aquatique | 50 | 1,0 | 0 % | 2/s | **Soin** : +5 PV/s aux ennemis dans 1 case |
| `slime-fusion` | Aquatique | 250 | 0,7 | 10 % | 10/s | **Mini-boss**. À la mort, se scinde en 2 `slime` (`summon_on_death`) |
| `wolf-gray` | Bête | 60 | 2,0 | 10 % | 8/s | Rapide, arrive en meute |
| `wolf-alpha` | Bête | 150 | 1,8 | 10 % | 14/s | **Meneur** : loups dans 2 cases +20 % vitesse |
| `wolf-aquatic` | Aquatique | 70 | 1,8 | 20 % | 8/s | Rapide et blindé |
| `wolf-aquatic-alpha` | Aquatique | 180 | 1,6 | 20 % | 14/s | **Mini-boss**. Meneur |
| `werewolf` | Bête | 400 | 1,4 | 20 % | 25/s | **Mini-boss**. Sous 50 % PV : vitesse ×1,5 (`fury_form`) |
| `treant` | Plante | 300 | 0,5 | 40 % | 10/s | Lent, très tanky |
| `treant-fighter` | Plante | 350 | 0,6 | 40 % | 30/s | **Mini-boss**. Briseur de ligne : frappe les bloqueurs ×3 (valeur déjà incluse) |
| `treant-flowering` | Plante | 250 | 0,5 | 30 % | 6/s | **Soin** : +8 PV/s aux ennemis dans 1,5 case |
| `dryad-fighter` | Reptile | 120 | 1,2 | 20 % | 15/s | Mêlée pure, cible de choix pour les Racines |
| `dryad-ranger` | Oiseau | 80 | 1,2 | 0 % | 4/s | **Tir** : Axie le plus proche à 2,5 cases, toutes les 1,5 s, 12 dégâts |
| `dryad-mage` | Oiseau | 100 | 1,0 | 0 % | 4/s | **Zone** : 15 dégâts à tous les Axies dans 1 case, toutes les 3 s |
| `bear-dad` | Bête | 1200 | 0,7 | 30 % | 40/s | **Boss**. Sous 50 % : Rage, cadence de marche +30 % |
| `bear-mom` | Bête | 1000 | 0,8 | 20 % | 30/s | **Boss**. Soigne bear-dad 10 PV/s à 2 cases. Briseuse de ligne, ×3 inclus |

Correction de la matrice v0.1 : **Machito et Shilin sont des Axies de base**, pas des chimères. Ils passent dans la collection (§9).

### 7.2 Règles d'attaque des chimères

- Une chimère **ne s'arrête que devant un bloqueur**. Elle le frappe avec sa valeur Mêlée jusqu'à le mettre KO, puis reprend sa route. Les chimères suivantes font la queue derrière, une par case, et frappent le bloqueur seulement si elles sont adjacentes à lui.
- Une chimère à distance tire **en marchant**, sans s'arrêter, sur l'Axie le plus proche à portée, bloqueur ou plaine. Bloquée, elle tire sur le bloqueur.
- Les Axies en plaine ne sont **jamais frappés en mêlée**. Seuls les tireurs et le mage les atteignent.
- Les Axies sur colline ne sont atteints que par `dryad-ranger` et `dryad-mage`. `slime-attack` les ignore.
- Le triangle s'applique aux attaques des chimères : une dryade Oiseau qui tire sur un Insecte fait ×1,15.
- Un Axie à **0 PV est KO** : retiré du plateau jusqu'à la fin de la vague, `defense/hit-die` joué. Un bloqueur KO libère le passage. Il revient automatiquement à la phase de placement, PV pleins, sans coût. Sa perte se paie en temps non acheté et en aura manquante pendant le reste de la vague.
- Un bloqueur se soigne **entièrement entre deux vagues**. Il n'y a pas de soin pendant la vague en v1.

### 7.3 Armure

Réduction en pourcentage des dégâts directs. Poison et Insecte l'ignorent. Fragile la divise par 2, Écailles retire 15 points, plancher 0. Exemple : un `treant` (40 %) adjacent à un Reptile et Fragile tombe à 12,5 %.

---

## 8. Économie

### 8.1 Budget d'énergie

- Chaque vague déclare son budget. Le budget est **entièrement disponible** à chaque phase de placement, sans report ni perte.
- Un Axie posé consomme son coût. Le retirer le rend. Le déplacer est gratuit.
- Le total posé ne peut pas dépasser le budget. Si le budget d'une vague est inférieur à ce qui est posé (ne doit jamais arriver par design, les budgets sont croissants), les Axies en surplus sont renvoyés au bac.

### 8.2 Coûts

| Classe | Coût |
|---|---|
| Aquatique, Oiseau | 1 |
| Plante, Insecte, Reptile | 2 |
| Bête | 3 |

Le profil ne change pas le coût en v1. Un DPS Bête et un Support Bête coûtent 3.

### 8.3 Courbe de budget par niveau

| Niveau | Vagues | Budget par vague |
|---|---|---|
| 1 | 5 | 3, 4, 4, 5, 5 |
| 2 | 5 | 3, 4, 5, 5, 6 |
| 3 | 6 | 3, 4, 4, 5, 5, 6 |
| 4 | 6 | 4, 4, 5, 5, 6, 6 |
| 5 | 7 | 4, 5, 5, 6, 6, 7, 7 |
| 6 | 7 | 4, 5, 5, 6, 7, 7, 8 |
| 7 | 8 | 5, 5, 6, 6, 7, 8, 8, 9 |
| 8 | 9 | 5, 6, 6, 7, 7, 8, 9, 9, 10 |

Un draft de 5 Axies coûte de 5 (5 pièces à 1) à 15 (5 Bêtes). Le budget max de 10 signifie qu'on ne pose **jamais tout un draft de Bêtes**. Le draft est un vrai choix.

### 8.4 PV et étoiles

- 3 PV par niveau. Un ennemi sorti = −1 PV. Un mini-boss sorti = −2 PV. Un boss sorti = −3 PV.
- Fin de niveau : **3 étoiles** à 3 PV, **2 étoiles** à 2 PV, **1 étoile** à 1 PV.
- Le niveau suivant se débloque à 1 étoile. La collection se débloque au total d'étoiles (§9.3).
- Maximum : 24 étoiles.

---

## 9. Collection et draft

### 9.1 Les 20 Axies de base

Source : `unity-axie-gtk2d/Assets/AxieInfinity/AxieStandardAssets/Spines/starter-axies/`. Spine 3.8.79, lisibles par pixi-spine 4.0.3 déjà présent dans le runtime web. **Le mixer n'est pas nécessaire en v1.**

### 9.2 Profil dérivé des parts

Chaque Axie a 6 parts : yeux, oreilles, bouche, corne, dos, queue. Chaque part a une classe. La **classe de l'Axie** (son corps) fixe attaque, statut, aura et coût. Les **parts** ajustent les stats :

| Classe de la part | Bonus par part |
|---|---|
| Bête | +6 % dégâts |
| Insecte | +3 % dégâts, +3 % cadence |
| Oiseau | +6 % cadence |
| Aquatique | +3 % cadence, +3 % PV |
| Plante | +6 % PV |
| Reptile | +4 % PV, +2 % dégâts |

Un Axie pur (6 parts de sa classe) atteint +36 % sur un axe. Le **profil affiché** est un résumé lisible du mélange :

| Profil | Condition |
|---|---|
| DPS | Bonus dégâts dominant |
| Rapide | Bonus cadence dominant |
| Tank | Bonus PV dominant |
| Hybride | Aucun bonus au-dessus de 15 % |

La portée ne dépend jamais des parts. Seule l'aura Vent la modifie.

**Piste v2** : la bouche, la corne, le dos et la queue portent les cartes de skill dans Axie Classic. On pourra faire varier l'attaque selon ces 4 parts sans toucher aux auras.

### 9.3 Roster, parts proposées et ordre de déblocage

Les parts réelles des starters ne sont pas lisibles dans les fichiers Spine. La répartition ci-dessous est **une proposition à ajuster** en regardant les sprites. Elle vit dans `axies.json`.

| Ordre | Axie | Classe | Parts (répartition proposée) | Profil | Déblocage |
|---|---|---|---|---|---|
| — | Buba | Bête | 6 Bête | DPS | Départ |
| — | Olek | Plante | 6 Plante | Tank | Départ |
| — | Puffy | Aquatique | 6 Aquatique | Hybride | Départ |
| — | Momo | Oiseau | 6 Oiseau | Rapide | Départ |
| — | Pomodoro | Insecte | 6 Insecte | Hybride | Départ |
| — | Venoki | Reptile | 6 Reptile | Tank | Départ |
| 1 | Xia | Bête | 4 Bête, 2 Oiseau | DPS | 2 ★ |
| 2 | Ena | Plante | 4 Plante, 2 Reptile | Tank | 3 ★ |
| 3 | Kestrel (`dps-bird`) | Oiseau | 2 Oiseau, 4 Bête | DPS | 5 ★ |
| 4 | Noir | Aquatique | 3 Aquatique, 3 Bête | DPS | 6 ★ |
| 5 | Shilin | Insecte | 4 Insecte, 2 Bête | DPS | 8 ★ |
| 6 | Fennel (`support-plant`) | Plante | 2 Plante, 2 Aquatique, 2 Oiseau | Hybride | 9 ★ |
| 7 | Machito | Reptile | 4 Reptile, 2 Bête | DPS | 11 ★ |
| 8 | Bing | Bête | 2 Bête, 4 Plante | Tank | 12 ★ |
| 9 | Rouge | Aquatique | 4 Aquatique, 2 Oiseau | Rapide | 14 ★ |
| 10 | Marlin (`dps-aquatic`) | Aquatique | 3 Aquatique, 3 Bête | DPS | 15 ★ |
| 11 | Thistle (`hybrid-plant`) | Plante | 2 Plante, 2 Bête, 2 Oiseau | Hybride | 17 ★ |
| 12 | Bramble (`support-beast`) | Bête | 1 Bête, 4 Plante, 1 Aquatique | Tank | 18 ★ |
| 13 | Fang (`dps-beast`) | Bête | 5 Bête, 1 Insecte | DPS | 20 ★ |
| v2 | Support Dusk | Dusk | — | — | Hors v1 |

Les parts hors classe occupent d'abord les yeux et les oreilles, puis la bouche : la bouche, la corne, le dos et la queue restent de la classe de l'Axie autant que possible, pour la v2 où elles porteront l'attaque. Les profils sont **calculés** par `tools/gen-data.mjs` depuis les parts et la règle §9.2, le tableau reflète le calcul. Les six starters sans nom officiel (`dps-*`, `support-*`, `hybrid-*`) portent des **noms de travail à valider**.

Le déblocage suit l'ordre de la campagne : un 6e Axie arrive avant le niveau 3, pour que le draft ait un vrai choix dès que le jeu s'ouvre.

### 9.4 Draft

- Après la fiche du niveau, avant le placement. **5 Axies** parmi la collection débloquée.
- La fiche du niveau montre le chemin et les **classes des chimères** annoncées. Le draft est un choix informé, pas un pari.
- Le draft est conservé sur « Réessayer ». Bouton « Changer le draft » sur l'écran de défaite.
- Niveaux 1 et 2 : draft imposé (onboarding, §12), qui peut compter moins de 5 Axies. Libre dès le niveau 3.

---

## 10. Les 8 niveaux

Chaque niveau introduit **une** mécanique et la met en scène par la composition des vagues. Le chemin est décrit en mots ici, tracé dans `levels/0N.json`.

| N | Nom | Chemin | Nouveauté | Chimères | Vagues | Combos attendus |
|---|---|---|---|---|---|---|
| 1 | La clairière | Ligne légèrement courbée, 19 cases | Placer, lancer, portée, bloquer | `slime` ×3 → ×10 | 5 | Nettoyeur, Orage |
| 2 | La lisière | S simple, 23 cases | Auras et adjacence | `slime`, `slime-forest-a/b` | 5 | Marécage, Orage |
| 3 | Le sentier des loups | Serpentin, 22 cases, 2 passages à une case d'écart | Ennemis rapides, ralentissement | `wolf-gray` en meute, `wolf-alpha` en vague 6 | 6 | Étau, Orage |
| 4 | Le marais | Zigzag, 24 cases | Armure, Trempé, triangle Plante/Reptile > Aquatique | `slime-attack/defense/support`, `wolf-aquatic`, mini-boss `wolf-aquatic-alpha` | 6 | Digue, Rempart |
| 5 | Le bosquet | Serpentin large, 26 cases | Tanks, Fragile, Poison ignore l'armure, briseur de ligne | `treant`, `treant-flowering`, mini-boss `treant-fighter` | 7 | Marécage, Exécution |
| 6 | Le cercle des dryades | Double passage central, 22 cases | Ennemis qui tirent sur la plaine et les collines, KO | `dryad-ranger/mage/fighter`, `slime-support` | 7 | Rempart, Nettoyeur |
| 7 | La meute | Serpentin sur toute la largeur, 30 cases | Vagues mixtes, Rage, tempo | Loups, `werewolf` en mini-boss vague 8, slimes en écran | 8 | Étau, Exécution |
| 8 | La tanière | Spirale, 27 cases, **sortie au centre du plateau** (la tanière), chemin repasse près de lui-même 3 fois | Boss à deux phases, briseurs de ligne | Tout le roster. Vague 8 : `bear-dad`. Vague 9 : `bear-mom` escortée | 9 | Exécution + tout le reste |

Le niveau 8 est la seule exception à « sortie en bas » : la spirale mène au terrier des ours au centre. Une vague se termine quand tous ses ennemis sont morts ou sortis, donc un boss ne peut pas « survivre » à sa vague : s'il sort, c'est la défaite.

Les chemins, collines et vagues exacts sont dans `axie-td/data/levels/0N.json`, générés et validés par `axie-td/tools/gen-data.mjs`.

### 10.1 Courbe de difficulté

Trois leviers, jamais plus d'un nouveau par niveau :

1. **Pression** : PV totaux de la vague ÷ budget. Monte doucement de 60 PV/énergie (niveau 1) à 250 PV/énergie (niveau 8).
2. **Vitesse** : le temps que met l'ennemi le plus rapide à traverser. Loups au 3, meneurs au 4 et 7.
3. **Contrainte** : armure (4, 5), tir sur les Axies (6), soin ennemi (4, 5, 8), briseurs de ligne (5, 8).

Le chemin est le quatrième levier, silencieux : plus il repasse près de lui-même, plus une bonne case vaut cher, plus le quinconce paie.

**Anti-tortue.** Un joueur qui mise tout sur les collines doit perdre à partir du niveau 5. Trois garde-fous : les collines sont rares (0 aux niveaux 1 et 2, 1 aux niveaux 3 à 5, 2 aux niveaux 6 à 8), la pression en PV par énergie des derniers niveaux dépasse ce qu'un ou deux tireurs sans aura peuvent sortir, et les soigneurs ennemis (`slime-support`, `treant-flowering`, `bear-mom`) annulent les dégâts trop lents. Les dryades des niveaux 6 à 8 atteignent les collines.

### 10.2 Format d'un niveau

```json
{
  "id": 3,
  "name": "Le sentier des loups",
  "path": [[3,0],[3,1],[2,1],[2,2], "..."],
  "hills": [[0,4]],
  "lives": 3,
  "waves": [
    {
      "budget": 3,
      "spawns": [
        { "t": 0.0, "enemy": "wolf-gray" },
        { "t": 1.5, "enemy": "wolf-gray" },
        { "t": 3.0, "enemy": "wolf-gray" }
      ]
    }
  ]
}
```

Les spawns sont listés explicitement, avec leur temps. Il n'y a **pas de seed** : le déterminisme vient de l'absence totale d'aléa, ce qui satisfait la décision 6 plus fortement qu'une seed. Le moteur tourne à **pas fixe de 30 Hz** logique, indépendant du framerate. Deux essais identiques donnent le même résultat.

---

## 11. UX mobile

### 11.1 Cadre

- **Portrait**, un seul doigt, **pas de zoom ni de pan**. Référence 390 × 780. Minimum 360 × 640.
- **Sur desktop** (le cas probable du jury), le même cadre portrait est centré à la hauteur de la fenêtre, le fond du niveau remplit les côtés. Souris = doigt. Aucune mise en page paysage en v1.
- **Le plateau est data-driven** : largeur et hauteur viennent du fichier de niveau. Passer en paysage en v2 est un changement de données et de mise en page, pas de simulation.
- Taille de case = min(largeur ÷ 8, (hauteur − 208) ÷ 13). Soit 44 px à la référence 390 × 780, 48 px sur un iPhone 14, 44 px sur un Android de 360 de large. **Risque accepté** : 35 px sur iPhone SE, où l'aimantation compense pour le glisser mais pas pour le tap sur une fiche. Le plateau est centré si un axe contraint.
- **Aimantation** : pendant un glissement, l'Axie saute à la case valide la plus proche du doigt. Le doigt n'a pas besoin d'être précis.
- Aucune saisie clavier. Aucun double-tap. Aucun geste multi-doigts.

### 11.2 Disposition de l'écran de jeu

Maquette visuelle : `design/maquette-ecran.html` (à ouvrir dans un navigateur). Elle montre la phase de placement avec un Axie en main et une vague en cours, avec la légende des cases et des liserés.

```
┌─────────────────────────────┐
│ ♥♥♥   Vague 3/6   ⚡ 4/5   │  Barre haute, 48 px
├─────────────────────────────┤
│                             │
│         Plateau 8 × 13      │  352 × 572 en référence
│                             │
├─────────────────────────────┤
│ [Ax1][Ax2][Ax3][Ax4][Ax5]   │  Bac du draft, 96 px
│  3     1     2     1     2  │  Coût sous chaque portrait
├─────────────────────────────┤
│   [ ▶ Lancer la vague ]  ×2 │  Barre basse, 64 px
└─────────────────────────────┘
```

### 11.3 Gestes en phase de placement

| Geste | Effet |
|---|---|
| Glisser un Axie du bac vers une case | Pose. Pendant le glissement : cases valides en vert (chemin inclus pour une classe mêlée, colline incluse pour une classe distance), portée en cercle, **auras en surbrillance** sur les voisins |
| Glisser un Axie du plateau vers une autre case | Déplace, gratuit |
| Glisser un Axie du plateau vers le bac | Retire, rend l'énergie |
| Tap sur un Axie posé | Affiche sa portée, son aura, et les auras qu'il reçoit. Tap ailleurs pour fermer |
| Appui long sur un Axie, bac ou plateau | Fiche : classe, profil, stats, attaque, aura, et **les 6 parts avec leur icône de classe et leur bonus**, en une carte. C'est là que le lien « traits → jeu » se voit |
| Tap sur un ennemi annoncé dans la barre haute | Fiche de la chimère : classe, PV, armure, comportement |

Un Axie du bac trop cher pour le budget restant est **grisé**, pas caché.

### 11.4 Gestes en vague

- Le plateau est verrouillé. Tap sur un Axie ou un ennemi ouvre sa fiche, sans pause.
- Bouton **×2** en bas à droite. Persiste entre les vagues.
- Pas de pause en v1. Une vague dure 40 s maximum.

### 11.5 Écrans

1. **Titre** : logo, « Jouer », lien Sky Mavis / licence.
2. **Carte de campagne** : 8 médaillons en colonne verticale, étoiles obtenues, total d'étoiles en haut, bouton « Collection ».
3. **Fiche du niveau** : nom, chemin miniature, chimères annoncées avec classe, meilleur score, bouton « Draft ».
4. **Draft** : grille de la collection, 5 emplacements en haut, Axies verrouillés en silhouette avec le seuil d'étoiles, bouton « Jouer ».
5. **Jeu** (§11.2).
6. **Résultat** : étoiles animées, Axie débloqué le cas échéant avec son animation `activity/appear`, boutons « Suivant » / « Réessayer » / « Carte ».
7. **Défaite** : vague atteinte, « Réessayer » / « Changer le draft » / « Carte ».
8. **Collection** : les 20 Axies, débloqués ou en silhouette, fiche au tap.

---

## 12. Onboarding

Règle : **zéro paragraphe**. Trois bulles maximum par niveau, chacune disparaît au premier geste correct.

**Niveau 1** — draft imposé : Buba, Momo, Puffy.

- Vague 1 : une case **du chemin** clignote. Bulle « Glisse Buba sur le chemin, il bloque ». Puis bulle sur le bouton « Lancer la vague ».
- Vague 2 : bulle « Momo tire loin. Place-le à côté du chemin, là où il voit le plus de cases ».
- Vague 3 à 5 : rien. Le joueur a compris.

**Niveau 2** — draft imposé : Olek, Pomodoro, Puffy, Momo.

- Vague 1 : bulle « Les cases voisines d'Olek ralentissent les ennemis » avec la surbrillance de l'aura.
- Vague 2 : bulle « Pomodoro à côté d'Olek : son poison dure deux fois plus longtemps ». C'est la seule réaction en chaîne expliquée du jeu.
- Ensuite : rien.

**Niveau 3** — draft libre. Bulle unique sur l'écran de draft : « Regarde les chimères annoncées avant de choisir ».

Le reste s'apprend par les fiches au tap et par les VFX distincts des réactions en chaîne.

---

## 13. Feedbacks

### 13.1 Visuel

| Événement | Feedback |
|---|---|
| Attaque | Animation Spine de l'Axie (`attack/melee/*` ou `attack/ranged/*`) + atlas `{classe}_{type}` sur la cible |
| Statut posé | Atlas du statut + icône au-dessus de l'ennemi |
| Réaction en chaîne | Atlas dédié, plus gros, plus lumineux. Ricochet = trainée `bird_projectile`, Brisure = `fragile` + `beast_smash` critique, Éclatement = `bleed_apply` en explosion, Enracinement = `leaf` + `poison_apply` |
| Dégâts | Nombre flottant, blanc. Critique : jaune, plus gros. Poison : vert, petit |
| Ennemi tué | `hit-die` + fondu 0,4 s |
| Ennemi sorti | Flash rouge du bord d'écran 0,2 s, cœur qui se brise dans la barre haute, vibration courte si disponible |
| Axie KO | `hit-die`, la case redevient vide en gris |
| Aura active | Liseré coloré discret entre l'Axie et le voisin qui en bénéficie. Visible en permanence |
| Fin de vague | Bandeau « Vague 3 terminée », le bac se réactive |
| Étoiles | Trois étoiles qui tombent une par une, `activity/victory-pose-back-flip` sur le premier Axie du draft |

### 13.2 Icônes de statut

Les 131 icônes de `Assets/OriginsKit/Textures/StatusIcons/` ne sont pas dans le dossier local. **À récupérer sélectivement** depuis le repo GitHub : les 8 statuts de §6.1 suffisent.

---

## 14. Audio

Source : 152 SFX de `axie-origins-asset-kit/web-vfx/public/sfx/`. Aucune musique dans le kit.

| Événement | SFX |
|---|---|
| Pose d'un Axie | Un son par classe, pioché dans les sons de cast de la classe |
| Attaque | Son de l'attaque de la classe, comme le VFX |
| Statut | Son du statut |
| Réaction en chaîne | Son du statut + son de l'attaque, superposés, léger pitch up |
| Ennemi sorti | Son grave, court |
| Lancement de vague | Son de cor ou équivalent du kit |
| Étoiles | Trois notes montantes |

**Musique** : pas de musique en v1, sauf si une piste sous licence compatible avec la publication est trouvée avant le 17/09. Un fond ambiant en boucle suffirait. La licence du kit (`axie-origins-asset-kit/LICENSE.md`) est **à relire avant publication** pour les SFX.

Volume : un seul bouton mute, dans la barre haute. Pas de réglages.

---

## 15. Sauvegarde

`localStorage`, une clé JSON :

```json
{
  "version": 1,
  "stars": { "1": 3, "2": 2, "3": 0 },
  "unlocked": ["buba", "olek", "puffy", "momo", "pomodoro", "venoki", "xia"],
  "lastDraft": { "3": ["buba", "olek", "puffy", "momo", "xia"] },
  "speed2x": false,
  "mute": false
}
```

Les déblocages sont recalculés depuis le total d'étoiles à chaque chargement. La liste `unlocked` est un cache.

---

## 16. Architecture technique

### 16.1 Stack

- **Vite + TypeScript**, base : `axie-origins-asset-kit/web-vfx/` copié et allégé.
- **PixiJS 7.2.4** pour le rendu, **pixi-spine 4.0.3** pour Axies et chimères. Le mixer reste dans les dépendances mais n'est pas utilisé en v1.
- **Licence Spine Essential** (69 USD) au nom d'Edouard, achetée avant l'intégration de pixi-spine : la licence des Spine Runtimes l'exige. Unity aurait la même contrainte.
- **VFX** : les atlas nécessaires uniquement (≈ 25 sur 107), sur le canvas overlay `plus-lighter` existant.
- Hébergement statique **Vercel**.

### 16.2 Modules

| Module | Rôle | Dépend de |
|---|---|---|
| `sim/` | Simulation pure à 30 Hz : grille, chemin, entités, statuts, auras, ciblage, dégâts. **Aucune dépendance Pixi.** Testable en Node | `balance.json`, `levels/*.json`, `axies.json` |
| `render/` | Lit l'état de `sim/` et l'affiche : sprites Spine, VFX, nombres flottants | `sim/`, Pixi |
| `ui/` | Écrans, HUD, drag & drop, fiches | `sim/` (état), `render/` |
| `data/` | Chargement des JSON, validation | — |
| `save/` | `localStorage` | — |

`sim/` est la partie qui porte tout le design. La séparer rend possible un test automatique par niveau : « avec ce placement, la vague 4 se termine à 3 PV ». C'est l'outil d'équilibrage.

### 16.3 Performance

- Textures Spine chargées une fois par type, instances partagées.
- Cible : 30 entités animées à l'écran à 60 fps sur un téléphone milieu de gamme de 2022.
- Atlas VFX chargés à la demande par niveau.

---

## 17. Périmètre

### 17.1 V1 — livrée le 21/09

- 8 niveaux, 6 classes, 20 chimères, 19 Axies (Dusk exclu).
- Draft, collection, étoiles, sauvegarde locale.
- Onboarding des niveaux 1 à 3.
- VFX et SFX du kit. Pas de musique.
- Mobile portrait, jouable aussi à la souris sur desktop.

### 17.2 V2 — round 2, octobre

- Mode endless sur le niveau 8 avec multiplicateur de PV.
- Repositionnement payant, 1 énergie.
- Support Dusk et éventuellement Mech / Dawn.
- Attaques variant selon les parts bouche / corne / dos / queue.
- **Mixer « live approuvé »** : exigé par les règles pour le round 2. Les Axies de la collection Ronin sont composés par `@axieinfinity/mixer` au lieu des starters Spine. Procédure d'approbation à éclaircir.
- **Vrais Axies** : le joueur saisit ou connecte son adresse Ronin, en lecture seule. Le proxy serveur (fonction Vercel, clé API côté serveur) renvoie ses Axies avec leurs gènes. Le mixer les affiche, les 6 parts alimentent le profil. Les starters restent disponibles sans adresse.
- **AXP** : à chaque niveau réussi, les 5 Axies du draft gagnent de l'AXP via l'API Sky Mavis, depuis le proxy. Barème proposé : 10 AXP par étoile, plafonné par niveau et par jour. C'est la réponse à l'angle « progression » d'Axie Core sans toucher à la règle d'or : **le jeu ne fait pas monter les Axies pour gagner, mais gagner fait monter les Axies**. Demande d'accès au service AXP dès l'annonce des finalistes.
- **Code de formation** : une victoire à 3 étoiles génère un code court à partager. Un autre joueur le colle et rejoue exactement la même formation contre les mêmes vagues, puis tente de faire mieux avec moins d'énergie. Coût faible grâce au déterminisme, premier pas vers le PvP asynchrone.
- PvP asynchrone : le joueur publie un placement, un autre tente de le battre avec les mêmes vagues.
- 4 niveaux supplémentaires.

### 17.3 Hors scope, définitivement

- Montée en niveau des Axies.
- Axies mobiles.
- Rendu 3D.
- Achats.

---

## 18. Planning jusqu'au 21/09

Aujourd'hui : 03/09. 18 jours. Solo, avec assistance IA.

| Dates | Jalon | Livrable vérifiable |
|---|---|---|
| 03 → 04/09 | GDD validé, données | `balance.json`, `axies.json`, `levels/01.json` à `08.json` en brouillon, schéma validé |
| 05 → 07/09 | Cœur de simulation | `sim/` : grille, chemin, spawn, déplacement, ciblage, dégâts, vagues. Test Node : un slime traverse, un Buba le tue |
| 08 → 10/09 | Les 6 classes | Statuts, auras, anti-empilement, triangle, 5 réactions en chaîne. Tests unitaires par réaction |
| 11 → 12/09 | Rendu et plateau | Spine des Axies et chimères, chemin dessiné, drag & drop, HUD, lancer / ×2 / retry |
| 13 → 14/09 | Niveaux 1 à 4 | Jouables de bout en bout, draft, étoiles, sauvegarde, carte de campagne |
| 15 → 16/09 | Niveaux 5 à 8 | Mini-boss, boss, tirs ennemis, KO, soin ennemi. Collection et déblocages |
| 17 → 18/09 | Feedbacks | VFX, SFX, nombres flottants, fiches, onboarding niveaux 1 à 3 |
| 19 → 20/09 | Équilibrage et déploiement | Playtest des 8 niveaux, ajustement de `balance.json`, Vercel en ligne, test sur 2 téléphones et 1 desktop |
| 20/09 | Dossier de soumission | Dépôt git public propre, **vidéo de démonstration** (2 min, capture d'écran, boucle complète), README au gabarit officiel (voir `CLAUDE.md` §1), test sur un navigateur vierge et déconnecté, lien HTTPS public |
| 21/09 | Marge | Soumission avant **20 h Vietnam, 15 h Paris** |

**Règle de coupe** si le 16/09 les niveaux 5 à 8 ne sont pas jouables : livrer 6 niveaux avec le boss au niveau 6, plutôt que 8 niveaux bancals. Le GDD reste la cible pour le round 2.

---

## 19. Risques

| Risque | Probabilité | Parade |
|---|---|---|
| Équilibrage des 6 auras insuffisant à la date | Élevée | `sim/` testable sans rendu, playtests automatisés dès le 10/09 |
| pixi-spine 4.0.3 ne lit pas un asset du toolkit | Faible | Vérifier le 05/09 sur Buba et un loup. Repli : mixer pour les Axies, sprites statiques pour les chimères |
| Perf mobile avec 30 Spine animés | Moyenne | Plafond à 20 ennemis simultanés dans les vagues, atlas partagés |
| Licence des SFX pour publication | À vérifier | Lire `LICENSE.md` le 04/09 |
| Drag & drop imprécis sur petit écran | Moyenne | Case de 44 px sur les téléphones courants (35 px sur iPhone SE, accepté), aimantation à la case la plus proche, pas de zoom |
| Le puzzle est trop dur pour un jury pressé | Moyenne | 1 étoile suffit pour avancer. Onboarding niveaux 1 à 3 |
| Le jury ne voit pas le lien Axie Core | Moyenne | Le README et l'écran de titre nomment l'angle traits + relations. Les fiches d'Axie montrent les parts et leur effet |
| Licence Spine | Réglé | Vérifié le 03/09 : licence Spine Editor obligatoire pour tout runtime. Essential 69 USD, à acheter avant le 05/09 |
| Pas de dépôt git ni de vidéo le 21/09 | Faible | Jalon dédié le 20/09, `git init` dès le premier jour de code |

---

## 20. Direction artistique

### 20.1 Principe

Les Axies et les chimères sont du cartoon aux couleurs saturées. **Tout le reste s'efface** : le plateau, le HUD et les fonds sont désaturés, aux contrastes bas, pour que l'œil aille aux personnages et aux informations de jeu.

Priorité de lisibilité, dans l'ordre : 1) le chemin, 2) qui est posé où, 3) portée et auras pendant le placement, 4) les statuts sur les ennemis, 5) le décor.

### 20.2 Sources d'assets

| Élément | Source | Statut |
|---|---|---|
| Axies, chimères | `unity-axie-gtk2d`, Spine 3.8.79 | Disponible |
| VFX, SFX | `axie-origins-asset-kit/web-vfx` | Disponible, licence à relire |
| Décor, objets | Land items du toolkit ; assets **Homeland** ou **Terrarium** si récupérables dans le respect de la licence | À chercher (Edouard) |
| Tuiles chemin / plaine / colline | À produire. Repli : formes plates en 3 tons | À produire |
| Icônes de classe | `Sprites/axie-class-icon/` du toolkit | Disponible |
| Icônes de statut | `Assets/OriginsKit/Textures/StatusIcons/` sur GitHub, 8 à récupérer | À récupérer |
| Icônes HUD (cœur, éclair, étoile, lecture, ×2, mute) | À produire, style plat arrondi | À produire |

Tout asset externe est enregistré dans `design/ASSETS.md` avec sa source et sa licence avant d'entrer dans le projet.

### 20.3 Plateau

- **Plaine** : ton vert-gris clair, texture à peine visible. Grille suggérée par un liseré à 10 % d'opacité, jamais par des lignes noires.
- **Chemin** : terre ou pierre, un ton plus sombre que la plaine, bords arrondis. C'est l'élément le plus contrasté du décor.
- **Colline** : la case est surélevée d'un léger décalage vers le haut et d'une ombre portée en bas. Rochers ou herbe plus haute. Doit se reconnaître sans légende.
- **Entrée / sortie** : une arche ou un trou de terrier en haut, un portail ou un village en bas. La sortie porte les 3 cœurs.
- Un fond par niveau, sur le même principe : clairière, forêt, marais, bosquet, cercle de pierres, montagne, tanière. Le fond peut être un simple dégradé teinté si le temps manque.

### 20.4 Interface

- **Police** : arrondie, cartoon, lisible en petit. Candidates sous licence libre : **Fredoka**, **Baloo 2**, **Nunito**. Une seule famille, deux graisses.
- **Formes** : coins arrondis partout, boutons épais, ombres douces. Pas de bordures fines.
- **Couleurs des classes**, reprises du canon Axie : Bête orange, Aquatique bleu, Plante vert, Oiseau rose, Insecte rouge, Reptile violet. Servent aux liserés d'aura, aux portraits du bac et aux fiches.
- **Surbrillances de jeu** : cases valides en vert clair, portée en cercle blanc translucide, aura reçue en liseré de la couleur de la classe qui la donne, cible invalide en rouge.
- **Jamais la couleur seule** (exigence d'accessibilité de l'organisateur) : chaque liseré d'aura porte aussi l'icône de la classe, les cases invalides ont une croix, les statuts ont une icône, les PV ont un nombre au tap.
- **Nombres flottants** : police du jeu, contour sombre, taille lisible à 1 m d'un téléphone.

### 20.5 Ce qui attend l'implémentation

Habillage définitif des écrans, animations d'interface, particules hors kit, musique, écran de titre. Le GDD fixe l'intention, pas le rendu final.

---

## 21. Fichiers de données à produire

Produits le 03/09 dans `axie-td/data/`, générés par `axie-td/tools/gen-data.mjs` (`node tools/gen-data.mjs` depuis `axie-td/`). **Le script est la source : on modifie le script, jamais les JSON à la main.** Il valide les chemins, les collines et les budgets, et imprime la pression de chaque vague.

| Fichier | Contenu |
|---|---|
| `balance.json` | Tables §5.1, §6.1, §7.1, §8.2, §9.2, multiplicateurs du triangle, règles des cases |
| `axies.json` | Les 20 Axies : id, nom, classe, dossier Spine, 6 parts, bonus calculés, profil, seuil de déblocage |
| `levels/01.json` à `08.json` | Format §10.2, plus `hills`, `entry`, `exit`, `draft.forced`, `onboarding` |
| `vfx-map.json` | Événement → atlas VFX, animation Spine, SFX du kit |
