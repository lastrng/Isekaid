# Phase 5 — Relations et conseils contextuels

Point de restauration vérifié avant modification : `backup-before-phase5-20260905`
(commit `25f4e7e6f6393379cca85e1a2329c37062b84eb1`, arbre propre).
Pour consulter ou reconstruire cet état sans écraser le travail courant :

```sh
git worktree add --detach /tmp/isekaid-before-phase5 backup-before-phase5-20260905
```

## Modèle

`buildJapanGraph` assemble le catalogue existant sans le dupliquer dans le stockage utilisateur.
Les identifiants sont préfixés par domaine (`code:baguettes`, `region:kansai`).
Les régions des villes sont rapprochées des identifiants du catalogue, avec conservation
de la valeur historique si elle est inconnue.

Les `themeIds` explicites d'un contenu priment sur `CONTENT_RELATIONS`, puis sur
l'inférence textuelle. La table éditoriale initiale couvre dix contenus existants.
L'inférence reconnaît mots entiers, accents et pluriels simples : « espace » ne
produit plus une recommandation de spa. Elle reste une approximation éditoriale.
Un lieu peut déclarer `relatedContent: ["code:baguettes"]` pour une relation directe.
Aucun champ n'est imposé aux anciens lieux et aucune migration cloud n'est nécessaire.

`relatedToActivity` conserve son API existante et accepte une intention optionnelle :

- `before` : conseils courts, codes sociaux et vie quotidienne ;
- `speak` : expressions et situations ;
- `explore` : traditions, lieux, villes et régions.

Classement déterministe : 4 points par thème partagé, 20 pour une relation directe,
9 pour la proximité déclarée, 2 pour la même ville, 1 pour la région correspondante.
Bonus avec thème partagé : 8 pour un conseil court, 3 pour une expression/situation.
Égalités départagées par identifiant ; maximum deux résultats de chaque domaine.
L'écran affiche au plus quatre résultats par rubrique et masque les rubriques vides.
Ce classement est une pertinence de contenu, pas un score de progression utilisateur.

## Expérience

Le composant partagé présent dans l'itinéraire et le Mode Japon propose « À savoir »,
« Phrases utiles » et « Découvrir ». Les explications, erreurs à éviter, vocabulaire
et conseils pratiques viennent du catalogue embarqué. Ils sont disponibles sans
appel réseau dès que l'application et son catalogue sont chargés. L'audio conserve
les dépendances existantes aux voix disponibles sur l'appareil.

## Vérification et limites

Tests : intégrité des dix liens dans le vrai catalogue, filtrage par intention,
accents/pluriels/faux positifs, régions, relations directes, exclusion du lieu courant.
`npm run check` vérifie aussi les anciens consommateurs, le catalogue et le build.
Pas de validation visuelle sur appareil dans cette étape. Le graphe est volontairement
minimal : pas encore de liens exhaustifs vers l'histoire, les souvenirs ou tous les
contenus ; aucune nouvelle progression « lu » n'est inventée.
