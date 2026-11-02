# Programme personnel avant le départ

La carte « Mon programme avant le départ » est disponible dans Aujourd’hui et
sur le tableau de bord Voyage. Elle concerne le prochain voyage à venir ; sans
dates, elle ouvre le résumé du voyage pour les renseigner. Elle disparaît dès
le départ, au profit des outils sur place.

Le programme propose une petite action à la fois et un calendrier dépliable :
les premières étapes et les politesses, les situations utiles à l’itinéraire,
puis les préparatifs de départ. Les dates sont des repères, calculés par
rapport au départ selon les jours calendaires au Japon. Toutes les actions
restent accessibles en avance ; les actions non terminées restent au programme.
Les derniers préparatifs passent en premier à l’approche du départ.

Les lieux du catalogue et les lieux personnalisés déclenchent les scénarios
pertinents (restaurant, café, izakaya, hôtel, shopping, konbini, musée), ainsi
que les codes sociaux des temples et des bains publics. Une seule action est
créée par contenu, même si plusieurs lieux sont concernés. Les contenus absents
ne génèrent jamais de lien. Le motif indique le lieu, la ville et le jour.

Le modèle `src/features/travel/preparationProgram.js` ne persiste rien : il
dérive les validations des scénarios terminés, lectures explicitement marquées
comme lues, préparatifs cochés, activités et documents du voyage. Ouvrir une
action ne la valide pas. Changer les dates recalcule les échéances ; modifier
l’itinéraire recalcule les contenus pertinents sans effacer les progrès.
Le composant actualise la date chaque minute et au retour dans l’application.
Le programme fonctionne avec les données locales et ne demande aucun appel IA.

Vérification : `node --test test/preparationProgram.test.js`, puis
`npm run check`. Le parcours navigateur est disponible dans
`scripts/qa-preparation-program.mjs`.
