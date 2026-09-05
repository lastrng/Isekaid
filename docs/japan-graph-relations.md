# Japan Graph — relations éditoriales et personnelles

Sauvegarde vérifiée avant modification : `backup-before-graph-relations-20260905`
(commit `ebc701bf2baf1c4d504c8ea8e66a9870151d1855`).

`buildJapanGraph(db, { trips, memories })` conserve un graphe en mémoire composé
de nœuds normalisés : `tip`, `tradition`, `code`, `daily`, `phrase`, `situation`,
`history`, `place`, `city`, `region`, puis `trip` et `memory` quand des données
utilisateur sont fournies. Chaque nœud expose `id`, `sourceId`, `title`, `summary`,
`cityId`, `regionId`, `themeIds`, `tags`, `relations`, `relatedContent` et `raw`.
Les anciennes données sans ces propriétés restent valides.

Le catalogue historique est désormais relié comme les autres domaines. Les lieux
peuvent déclarer `tags`, `themeIds`, `relations` et `relatedContent` pour des liens
éditoriaux explicites. Ces liens priment sur l’inférence de thèmes. Une relation
vers `history:edo` ou `tradition:shinto` n’exige donc pas de modifier le texte de
la fiche.

Les voyages personnels deviennent des nœuds liés aux lieux inscrits dans leurs
journées. Un souvenir n’est créé que pour une activité marquée comme faite avec
une note ou une photo ; il est lié à son lieu et à son voyage. Les données ne sont
pas mutées, copiées dans le catalogue ou envoyées à Supabase par le graphe.
`relatedToActivity` peut filtrer l’intention `personal` pour retrouver uniquement
les voyages et souvenirs liés au lieu courant. Les vues d’activité et l’accueil
réutilisent maintenant le graphe avec les voyages locaux disponibles.

Les huit régions historiques et les villes restent compatibles avec les noms
accentués et les identifiants existants. Les règles de classement précédentes
(thèmes, ville, proximité, relation directe et limite par domaine) demeurent
déterministes. Aucun lieu, souvenir ou fait historique n’est inventé pour remplir
une relation absente.

Tests : intégrité du catalogue historique, relation explicite, tags/métadonnées,
voyage et souvenir réellement visités, absence de mutation. `npm run check` passe
(37 fichiers de tests, validation, audit éditorial et build). Le bundle conserve
son avertissement de taille ; aucune migration de données ni validation visuelle
sur appareil n’a été effectuée.
