# Matrice de design — Axie Tower Defense (v0.1)

> Règle d'or : **on ne monte jamais un Axie en niveau.** La puissance vient de *qui* on place et *à côté de qui*.

---

## 1. Cadre

| Élément | Choix |
|---|---|
| Défenseurs | Axies du joueur (6 classes) |
| Attaquants | **Chimères du lore** (slimes, loups, treants, dryades, ours) — pas des Axies |
| Grille | 5 colonnes × 8 lignes, portrait mobile, chemin fixe par niveau |
| Ressource | Énergie fixe par vague (pas de gold cumulatif) |
| Repositionnement | **Gratuit en v1**, payant (1 énergie) en v2 |
| Vagues | **Déterministes** — seed par niveau, identiques après défaite |
| Roster | Draft de 5 Axies parmi la collection du joueur avant la partie |

---

## 2. Triangle de classes (canon Axie)

```
Bête / Insecte / Mech   →bat→   Plante / Reptile / Dusk
Plante / Reptile / Dusk →bat→   Aquatique / Oiseau / Dawn
Aquatique / Oiseau/Dawn →bat→   Bête / Insecte / Mech
```

- Avantage : **×1.15 dégâts**
- Désavantage : **×0.85 dégâts**
- Neutre : ×1.0

*Mech / Dawn / Dusk = classes secrètes, réservées au contenu tardif.*

---

## 3. Matrice des 6 classes

| Classe | Rôle TD | Attaque (VFX kit) | Statut appliqué | **Aura d'adjacence** (4 cases orthogonales) |
|---|---|---|---|---|
| **Bête** | Burst mono-cible | `beast_smash` — courte portée, gros dégâts, cadence lente | `rage` | **Fureur** : les voisins font **+30 % de dégâts** aux cibles sous 50 % PV |
| **Aquatique** | Contrôle / setup | `aquatic_projectile` — portée moyenne, dégâts faibles | `bubble` → **Trempé** (4 s) | **Marée** : les cibles touchées par un voisin deviennent **Trempées** |
| **Plante** | Mur / ralentissement | `plant_gore` — corps à corps, tanky | `taunt` | **Racines** : ennemis adjacents **−40 % vitesse** |
| **Oiseau** | Dégâts à distance | `bird_projectile` — longue portée, cadence rapide | `feather` (marque) | **Vent** : **+1 case de portée** à tous les voisins |
| **Insecte** | DoT / anti-armure | `bug_bite` — portée courte, ignore l'armure | `poison_apply`, `bleed_apply` | **Essaim** : les DoT posés par les voisins **tickent 2× plus vite** |
| **Reptile** | Debuff / anti-boss | `reptile_cast` — portée moyenne, dégâts modérés | `fragile`, `weak` | **Écailles corrosives** : ennemis adjacents **−30 % armure** |

**Règle anti-empilement** : deux Axies de la même classe côte à côte **ne cumulent pas** leur aura (la plus forte s'applique). Force la diversité de placement.

---

## 4. Interactions de statuts (le cœur du jeu)

| Statut | Posé par | Effet seul | Réaction en chaîne |
|---|---|---|---|
| **Trempé** | Aquatique | +20 % dégâts subis | **Oiseau** sur cible Trempée → l'attaque **rebondit sur 2 ennemis** proches |
| **Racines** (slow) | Plante | −40 % vitesse | **Insecte** sur cible ralentie → **poison ×2 durée** |
| **Fragile** | Reptile | −30 % armure | **Bête** sur cible Fragile → **coup critique garanti** |
| **Saignement** | Insecte | DoT | **Bête** finit une cible qui saigne → **explosion AoE** (`bleed_apply` + `beast_smash`) |
| **Taunt** | Plante | Attire les ennemis | Regroupe la vague → prépare l'AoE Aquatique+Oiseau |

---

## 5. Combos cibles (ce que le joueur doit découvrir)

| Nom | Composition | Contre quoi |
|---|---|---|
| **Orage** | Aquatique + 2 Oiseaux adjacents | Vagues denses de slimes |
| **Marécage** | Plante + 2 Insectes adjacents | Ennemis tanky / attrition |
| **Exécution** | Reptile + Bête + Insecte | Boss et élites |
| **Digue** | 2 Plantes en quinconce + Oiseau au centre | Vagues rush rapides |
| **Nettoyeur** | Insecte + Bête | Vagues nombreuses à faibles PV |

Chaque niveau est conçu pour qu'**au moins 2 combos différents** fonctionnent : pas de solution unique.

---

## 6. Ennemis (chimères disponibles dans l'asset kit)

| Chimère | Classe suggérée | Comportement |
|---|---|---|
| `slime`, `forest-slime-*` | Plante | Basique, nombreux |
| `aqua-slime-atk/def/sup/boss` | Aquatique | Variantes de rôle, boss inclus |
| `gray-wolf`, `alpha-wolf`, `werewolf` | Bête | Rapides, en meute |
| `aqua-wolf`, `aqua-alpha-wolf` | Aquatique | Rapides + résistance |
| `treant`, `treant-fighter`, `flowering-treant` | Plante | Lents, très tanky |
| `dryad-fighter/mage/ranger` | Oiseau / Reptile | Distance, soutien |
| `daddy-bear`, `mommy-bear` | Bête | Mini-boss |
| `machito`, `shilin` | Reptile / Insecte | Élites |

---

## 7. Stack technique retenu (2D web)

- **PixiJS 7.2.4** + **`@axieinfinity/mixer` 1.4.9** → corps des Axies
- **VFX** : 107 atlas additifs de `axie-origins-asset-kit/web-vfx/public/vfx/` (overlay canvas `mix-blend-mode: plus-lighter`)
- **SFX** : `web-vfx/public/sfx/`
- **Icônes de statut** : 131 dans `Assets/OriginsKit/Textures/StatusIcons/`
- Build : Vite + TypeScript, hébergement statique (Vercel / Netlify)

---

## 8. Points ouverts / risques

1. **« Axies que le joueur possède »** : lire la vraie collection Ronin exige un proxy serveur (la clé API ne doit **jamais** être côté client). → v1 : collection locale débloquée en jouant ; v2 : connexion wallet en lecture seule.
2. Équilibrage : 6 classes × 6 auras = 15 paires à tester. Prévoir un fichier `balance.json` éditable à chaud.
3. Perf mobile : le mixer compose 6 parties par Axie — mettre en cache les textures composées, viser < 30 Axies à l'écran.
