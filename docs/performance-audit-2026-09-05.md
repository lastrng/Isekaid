# Audit performance

## Mesures du build

Le build Vite produit notamment :

- `japan-data` : environ 819 kB minifiés (276 kB gzip) ;
- entrée principale : environ 525 kB minifiés (156 kB gzip) ;
- `lieu-editorial` : environ 283 kB minifiés (79 kB gzip).

Le catalogue est chargé par import dynamique après le démarrage, ce qui évite
de bloquer le shell initial. Leaflet et les feuilles de style de carte sont
chargés à la demande lors de l’ouverture de la carte. Les écrans Profil,
Premium et Onboarding sont déjà en `lazy`.

## Corrections appliquées

L’accueil réutilise désormais le tableau de voyages déjà en mémoire pour les
cartes `ResumeCard` et la préparation, au lieu de relire et repars(er) le
stockage local à chaque rendu. Le comportement reste identique et les mises à
jour continuent d’être déclenchées par les événements de synchronisation.

## Points surveillés

- Les grandes listes éditoriales sont filtrées par `useMemo`; l’index de
  recherche est construit à l’ouverture de la recherche.
- Les cartes Leaflet sont détruites lors du démontage et les marqueurs sont
  mis à jour sans reconstruire la carte pour chaque sélection.
- Les photos de souvenirs sont compressées avant stockage/envoi.
- Les animations utilisent des imports différés et ne pilotent pas la logique
  métier.
- Les appels Supabase restent déclenchés par session ou action utilisateur;
  aucune boucle réseau n’est ajoutée.

Le principal chantier futur est le découpage du catalogue éditorial et de
`App.jsx` en chunks plus fins. Le warning Vite sur les chunks de plus de 500 kB
est suivi, mais un découpage supplémentaire doit être mesuré avant d’être
introduit.
