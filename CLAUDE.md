# Axie Tower Defense — Brief de projet

> Document de reprise. À lire en entier avant toute action.
> Contexte : Edouard participe seul à l'**Axie Vibeathon** (Sky Mavis) et développe un tower defense mobile.

---

## 0. Ton rôle

Tu es **game designer senior**, partenaire de réflexion.

- Français, ton professionnel mais naturel, **concis et direct**.
- Ne détaille pas ton raisonnement interne, n'explique pas l'évident.
- Distingue clairement : **réaliste / risqué / exploratoire**.
- Signale hypothèses, incertitudes et points bloquants en quelques mots.
- Une question uniquement si elle est réellement nécessaire.
- Format par défaut : 1) recommandation principale, 2) alternatives, 3) prochaines actions.

**Règle absolue en cours** : on définit **tout le jeu avant la moindre ligne de code**. Pas de prototype tant que le GDD n'est pas complet et validé.

---

## 1. Le concours

| | |
|---|---|
| Événement | Axie Vibeathon — https://vibeathon.axieinfinity.ai |
| Statut | **Inscrit** |
| Participation | Solo, un seul jeu par participant |
| Round 1 | 08 → 21/09/2026 |
| Round 2 | 04 → 31/10/2026 |
| Résultats | 05/11/2026 |
| Livrable | Jeu **jouable en ligne, hébergé par le participant**, soumis par lien |
| Dotation | 20 000 bAXS ; 250 USDC d'outillage IA pour les finalistes du round 2 |
| Outils IA | Autorisés et encouragés |

**Contrainte forte** : une version jouable doit exister avant le 21/09, **20 h heure du Vietnam** (15 h à Paris).

### Règles officielles (vérifiées le 03/09 sur `/rules/1.0.1`)

- **Notation** : Axie Core 35 % · Gameplay 25 % · Vision produit 20 % · Faisabilité 10 % · Qualité du prototype et de la documentation 10 %. Aucun vote communautaire.
- **Livrables round 1** : build jouable externe, pitch concis, **dépôt consultable**, **vidéo de démonstration de secours**, contrôles et appareils supportés, problèmes connus, adéquation Axie Core et vision produit, déclarations exactes (usage de l'IA, travail préexistant, starters, dépendances, assets, contributeurs).
- **Round 2** : boucle de jeu complète, **un Mixer « live approuvé »**, intégration Axie Core significative. Le guide Notion précise : « Mixers are optional in Round 1 » et « Onchain features are not required for Round 1 or automatically required for Round 2 ». La procédure d'approbation du mixer n'est décrite nulle part : demander sur le Discord (canal ressources, contact « Jaatster »).
- **« Axie Core » = le thème du concours**, laissé à l'interprétation. Le guide liste les angles : *identité des Axies, traits, collection, progression, relations, soin, combat, Lunacia*. Critère de jugement : « Axie identity, world, traits, relationships, or progression affects the experience ». Notre angle : **traits (classes + parts) et relations (auras d'adjacence)**, chimères de Lunacia en ennemis.
- **Données Sky Mavis en lecture seule** (API via Ronin Developer Console, sans wallet) « peuvent renforcer l'intégration Axie Core ». Piste round 2 : lire les parts réelles des Axies du joueur. La clé API ne va jamais côté client.
- **Licence** : l'Axie Origins Battle Kit est autorisé pour créer, tester, soumettre, démontrer, juger et exposer l'entrée. Limité, non exclusif, révocable, non transférable.
- **Licence Spine (vérifiée le 03/09)** : les Spine Runtimes (pixi-spine, spine-unity, tous) exigent que **chaque développeur détienne une licence Spine Editor valide au moment de l'intégration** (Spine Editor License §2). Essential = **69 USD**, valable sous 500 k USD de revenus annuels. La version Trial n'autorise pas l'intégration. Passer à Unity ne change rien, spine-unity est sous la même licence. **Action : acheter Spine Essential avant la première ligne de code.**
- **Le mixer** (`@axieinfinity/mixer`) : bibliothèque JS qui prend les **gènes** d'un Axie (chaîne hexadécimale) et assemble son corps 2D : squelette Spine + les 6 parts + couleurs, textures chargées depuis le CDN `axiecdn.axieinfinity.com` sans clé API. Il repose sur pixi-spine 3.8. C'est ce qui permet d'afficher **n'importe quel Axie réel**, pas seulement les 20 starters. Round 1 : inutile. Round 2 : obligatoire (« live approved Mixer »). **Edouard confirme (03/09) : le mixer inclus dans l'Axie Origins Battle Kit est le mixer « live approuvé ».** Pas de procédure d'approbation séparée à prévoir.
- **AXP (Axie Experience Points)** : progression officielle des Axies, hors chaîne, gérée par Sky Mavis. Un jeu tiers peut en attribuer via `POST /axp/update/update_axp` (clé API en en-tête, donc **depuis un serveur**), après création d'une app dans le Ronin Developer Console et demande d'accès au service AXP. Le corps de requête : `axie_id`, `xp`, `timestamp`, `metadata`. Pas de signature du joueur pour gagner de l'AXP. **Candidat round 2** : les Axies du draft gagnent de l'AXP à chaque niveau réussi.
- Aucune exigence de plateforme ni d'orientation. Le guide dit « choose browser or desktop as your target » et demande de tester le tactile si on annonce le mobile.
- **Accessibilité attendue** : pas d'information transmise par la couleur seule, contrôles affichés dans le jeu, bouton mute, pas de flash excessif, retry rapide.
- **README de soumission** (gabarit officiel) : titre, pitch, interprétation d'Axie Core, lien du build, dépôt, vidéo de secours, plateformes, contrôles, comment démarrer, victoire, défaite et retry, problèmes connus, moteur et version, outils IA, composants générés, travail préexistant et starters, sources d'assets et mentions, dépendances, contact.
- Sources : `vibeathon.axieinfinity.ai/rules/1.0.1`, Notion « Get Started with Axie Vibeathon », « Builder Resource Kit », « 1. Choose Your Game », « 5. Playtest, Polish and Submit ». Lunalog (`app.axieinfinity.com/lunalog/catalog/`) référence les classes, parts et attributs.

---

## 2. Le concept

Tower defense mobile où chaque **classe d'Axie** possède des atouts et skills spécifiques, à placer judicieusement pour contrôler et éliminer des vagues d'ennemis.

> **Règle d'or : on ne monte jamais un Axie en niveau.**
> La victoire vient du **choix** des Axies et de **leur disposition les uns par rapport aux autres**, jamais de l'upgrade.

---

## 3. Décisions actées (à ne pas remettre en cause sans raison)

| # | Décision |
|---|---|
| 1 | **Triangle de classes canonique Axie**, ±15 % de dégâts. Socle du gameplay. |
| 2 | **Auras d'adjacence** : chaque classe a 1 attaque + 1 aura qui n'affecte que les cases voisines. |
| 3 | **Anti-empilement** : deux Axies de même classe adjacents ne cumulent pas leur aura (la plus forte s'applique). Interdit le spam mono-classe. |
| 4 | **Ennemis = chimères du lore** (slimes, loups, treants, dryades, ours). Les Axies défendent, les chimères attaquent. |
| 5 | **Repositionnement gratuit en v1**, payant envisagé en v2. |
| 6 | **Vagues déterministes** (seed fixe par niveau) : identiques après une défaite. Exigence explicite. |
| 7 | **Draft avant partie** parmi les Axies que le joueur possède. |
| 8 | **V1 : collection locale**, uniquement les **Axies de base (starters)** existants. Pas de wallet, pas de NFT. |
| 9 | **Rendu 2D.** Pas de 3D/GLB. |
| 10 | Axies mobiles / patrouilleurs : **écarté**. PvP asynchrone : reporté au round 2. |

**Pourquoi pas de wallet en v1** : lire la vraie collection Ronin exige un proxy serveur, la clé API ne doit jamais partir côté client. Hors scope pour le round 1.

---

## 4. Stack technique retenue

- **PixiJS 7.2.4** + **`@axieinfinity/mixer` 1.4.9** → corps des Axies
- **VFX** : 107 atlas additifs, overlay canvas `mix-blend-mode: plus-lighter`
- **Vite + TypeScript**
- Hébergement statique (Vercel / Netlify)
- Cible : **mobile portrait**, un doigt, drag & drop

---

## 5. Ressources locales (dossier `Axie_infinity`)

| Chemin | Contenu |
|---|---|
| `design/GDD.md` | **GDD v1.0, source de vérité.** Mode d'emploi et glossaire en §0. Conçu pour être repris seul dans une nouvelle conversation. |
| `design/maquette-ecran.html` | Maquette de l'écran de jeu 7 × 10 (placement + vague), à ouvrir dans un navigateur. |
| `axie-td/` | **Futur dépôt du jeu.** `tools/gen-data.mjs` génère et valide `data/balance.json`, `data/axies.json`, `data/levels/0N.json`, `data/vfx-map.json`. On modifie le script, jamais les JSON. |
| `design/MATRICE.md` | Matrice de design v0.1, historique. Le GDD la remplace là où ils divergent. |
| `unity-axie-gtk2d/` | Toolkit 2D officiel Sky Mavis : starters (Xia, Bing, Noir, Rouge), cartes de parties, items de land, Spine 3.8. ⚠️ `.git` cassé (montage sans droit de suppression), les fichiers sont complets. |
| `axie-origins-asset-kit/web-vfx/` | **Le plus important.** Runtime web officiel : Vite + PixiJS + mixer, **107 atlas VFX**, 152 SFX. `npm install && npm run dev` → http://127.0.0.1:5178/ |
| `axie-origins-asset-kit/*.md` | README, DESIGN, PRODUCT, GOAL, licence. **Lire `LICENSE.md` avant de publier.** |

⚠️ Le dossier Unity `Assets/OriginsKit` (1,5 Go) n'a **pas** été copié — inutile pour du web 2D. Les 131 icônes de statut et les corps Spine des chimères s'y trouvent : à récupérer sélectivement depuis GitHub si besoin.

### Vocabulaire VFX disponible (contrainte de design)

Tout effet inventé doit correspondre à un atlas existant.

- **Attaques** : `{classe}_{bite|cast|gore|projectile|slash|smash|throw}` pour les 9 classes (aquatic, beast, bird, bug, dawn, dusk, mech, plant, reptile).
- **Statuts** : `poison_apply`, `bleed_apply`, `stunned`, `sleep`, `fear`, `taunt`, `shield`, `shield_break`, `heal`, `heal_block`, `weak`, `vulnerable`, `fragile`, `silence`, `disarmed`, `stealth`, `drain`, `reflect_damage`, `dmg_boost`, `healing_boost`, `doubt`, `hex`, `rage`, `cleanse`, `dispel`, `death_mark_apply`, `summon_on_cast`, `summon_on_death`, `bubble`, `bubble_bomb`, `feather`, `leaf`, `cure`, `power_gain`, `power_awaken`, `fury_form`.

---

## 6. Repos officiels

- https://github.com/axieinfinity/unity-axie-gtk2d
- https://github.com/axieinfinity/axie-origins-asset-kit
- https://github.com/axieinfinity/mixer (package JS `@axieinfinity/mixer`)

---

## 7. Où on en est / prochaine étape

Le 03/09, les décisions structurantes ont été tranchées avec Edouard et le **GDD v1.0 est rédigé dans `design/GDD.md`**. Il remplace la matrice là où ils divergent.

Décisions actées le 03/09 :

1. **Campagne linéaire de 8 niveaux faits main**, extensible.
2. **Format court 3-5 min**, vagues croissantes (5 → 9), placement sans limite de temps, lancement manuel.
3. **Énergie fixée par vague, recyclable, coût par classe** (slots simples en repli).
4. **3 PV cumulés par niveau, étoiles selon les fuites** (3 ★ = zéro fuite).
5. **Classe + profil** : la classe fixe attaque / statut / aura ; le profil dérive des 6 parts et ajuste les stats. Dusk hors v1. Pas de cosmétique pur.
6. **Plateau 8 × 13 sans zoom** (révisé le 10/09, était 7 × 10), aimantation à la case. Les classes mêlée (Plante, Bête, Insecte) peuvent se poser **sur le chemin et bloquer**, sans plafond. Les classes distance en plaine.
7. **Colline** : 1 à 2 cases par niveau, distance uniquement, intouchable sauf par les dryades. Prix : portée −1, aucune aura.
8. **Direction artistique** (GDD §20) : personnages saturés, décor effacé, police arrondie cartoon. Edouard cherche des assets Homeland / Terrarium pour le décor.
9. **Portrait assumé**, jeu mobile. Sur desktop, cadre portrait centré.
10. **Stack confirmée PixiJS + pixi-spine**, Unity écarté (même licence Spine, build WebGL trop lourd pour le mobile web). **Edouard achète Spine Essential** (décidé le 03/09). Alternatives sans Spine étudiées et écartées : sprites fixes (repli), GLB 3D pré-rendus, lecteur maison.
11. **Axie Core** : pas de système supplémentaire en round 1. On rend visibles les traits (fiche avec les 6 parts) et les relations (liserés d'aura). Round 2 : vrais Axies via l'API + AXP gagné en jouant.

Faits vérifiés le 03/09 : 20 Axies de base et 20 chimères en **Spine 3.8.79**, lisibles par pixi-spine 4.0.3 déjà dans le runtime web → **mixer inutile en v1**. Machito et Shilin sont des Axies, pas des chimères.

**GDD v1.0 validé par Edouard le 03/09.** Fichiers de données produits le même jour dans `axie-td/data/` via `axie-td/tools/gen-data.mjs`.

**Plan d'implémentation rédigé le 03/09** dans `docs/superpowers/plans/2026-09-03-axie-tower-defense.md` : 21 tâches, 154 étapes, code et tests fournis, index des signatures inter-tâches en annexe. Conçu pour être exécuté tâche par tâche par un modèle moins puissant que Fable.

**Étape suivante : exécution du plan**, une tâche à la fois, avec `superpowers:subagent-driven-development` ou `superpowers:executing-plans`. Le jalon central est la tâche 10 : le jeu se joue entièrement sans rendu, ce qui rend l'équilibrage possible.

Points ouverts hors code : achat de la licence Spine Essential, assets de décor Homeland / Terrarium (Edouard), validation des noms de travail des six starters sans nom (Kestrel, Fennel, Marlin, Thistle, Bramble, Fang).

Modèles conseillés pour la suite : Sonnet 5 en effort élevé pour le code au quotidien, Opus 5 pour la simulation, les auras et les bugs récalcitrants, Haiku 4.5 pour les tâches mécaniques.
