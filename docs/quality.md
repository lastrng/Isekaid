# Qualité et tests

La commande `npm run check` reste le contrôle de référence : elle exécute
toutes les suites Node, la validation structurelle, l’audit éditorial puis le
build Vite.

La commande ciblée `npm run test:models` regroupe les domaines métier
prioritaires :

- état Japon, voyage actif, jour courant, prochaine activité et progression ;
- score de préparation ;
- recommandations contextuelles ;
- migration et normalisation du profil ;
- Mode Japon ;
- stratégie offline et file de mutations.

Chaque nouvelle fonction métier doit rester testable sans React. Les tests
vérifient les données connues, les états vides, les dates limites, les entrées
invalides et l’absence de mutation involontaire. Toute modification importante
doit d’abord passer les tests ciblés, puis `npm run check` avant le groupe
suivant.
