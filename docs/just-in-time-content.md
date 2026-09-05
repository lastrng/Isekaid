# Contenu contextuel juste à temps

Sauvegarde vérifiée avant modification : `backup-before-contextual-content-20260905`
(commit `1d67ca613265ccccc3134e2c38c996343980b921`).

`getContextualContent(activity, graph, { limit })` est l’API unique pour les
conseils à afficher avant une activité. Elle accepte un lieu, une activité ou
un objet contenant `place`/`lieu`. Les caractéristiques exploitées sont celles
du graphe : nom, type, catégorie, description, conseil, tags, `contextTags`,
`caracteristiques`, intérêts et relations explicites.

Le moteur réutilise le classement de `relatedToActivity` avec l’intention
`before`, puis limite le résultat aux domaines courts (`tip`, `code`, `daily`).
Les relations explicites sont prioritaires, puis les conseils courts, puis le
score de thèmes, ville et proximité. Les égalités sont déterministes et la
limite est appliquée après le tri. Les composants ne contiennent aucune règle
spécifique à l’onsen, au sanctuaire, au restaurant ou au train.

Le catalogue embarqué couvre ainsi les quatre exemples : règles du bain,
étiquette du sanctuaire, pourboire au restaurant et voiture du Shinkansen.
Ajouter une nouvelle situation consiste à enrichir les tags ou à déclarer
`relatedContent`, sans modifier `ActivityContext`.

L’onglet « À savoir » appelle cette API ; « Phrases utiles » et « Découvrir »
continuent d’utiliser la même base relationnelle avec leurs intentions propres.
Les textes déjà chargés restent utilisables hors connexion. Le tuteur demeure
optionnel et dépend du réseau.

Tests : les quatre caractéristiques d’exemple, la limite, les domaines autorisés,
les relations explicites et l’absence de cible. `npm run check` reste la
validation de référence. Le graphe ne génère pas de faits nouveaux et aucune
migration de données n’est requise.
