# Statistiques « Mon Japon »

Les statistiques de `Mon Japon` sont calculées localement par
`buildMyJapanSummary`. Elles ne sont affichées que lorsque la source permet un
calcul fiable.

## Règles actuelles

- **Voyages** : voyages dont le statut métier est `completed`.
- **Jours au Japon** : somme inclusive des dates de début et de fin des
  voyages terminés. La valeur reste inconnue (`—`) si un voyage terminé ne
  possède pas de dates exploitables.
- **Lieux faits** : lieux associés à une activité marquée `fait` dans un
  voyage terminé.
- **Villes** : villes déduites des lieux faits.
- **Régions** : régions déduites du catalogue des villes visitées.
- **Préfectures** : déduites de `city.prefecture` ou `city.prefectureId`.
  Tant que le catalogue ne fournit pas cette donnée pour toutes les villes
  visitées, la valeur reste inconnue.
- **Expressions apprises** : entrées de `expressionProgress` marquées
  `learned` ou ayant un niveau au moins égal à 3. Une progression absente
  laisse la valeur inconnue.
- **Favoris** : nombre d’éléments du tableau de favoris fourni au modèle.

Les collections sont ajoutées uniquement lorsqu’une donnée source est
disponible. Une valeur inconnue est rendue par `—`, jamais remplacée par zéro.
Les champs `completedDays` et `completedTripDetails.days` restent conservés
pour compatibilité : ils décrivent les jours d’itinéraire ou d’activité, pas
nécessairement le nombre de jours passés au Japon.

## Évolution prévue

Le modèle accepte déjà les progressions de kana et les favoris sans imposer de
nouveau schéma Supabase. Les villes pourront être enrichies progressivement
avec une préfecture, puis les collections pourront agréger souvenirs,
apprentissages et régions sans modifier les données historiques.

## Passeport et tampons

`buildPassportStamps` produit des tampons déverrouillés par des preuves issues
des voyages :

- un tampon de ville après une activité ou une journée marquée comme faite ;
- un tampon de région lorsqu’une ville de cette région est découverte ;
- un tampon de voyage lorsqu’un voyage est confirmé comme effectué.

Chaque tampon expose `type`, `unlockedBy` et `evidence` afin d’ajouter d’autres
collections plus tard sans attribuer de récompense sur la seule consultation
d’un écran.

## Après le voyage

À la lecture des voyages, une période passée contenant au moins une activité
marquée comme faite est normalisée en `completed` et reçoit `completedAt`.
Une période passée sans activité faite reste `awaiting_confirmation` afin de
laisser l’utilisateur confirmer ou annuler le voyage. Les voyages complétés
restent dans le modèle et alimentent `completedTripDetails` et son alias
`tripRecaps`.

Chaque récapitulatif conserve les dates, la durée connue, les villes et lieux
visités, le nombre de notes, les `noteEntries` structurées et les entrées du
carnet (`journalEntries`). Les photos et notes existantes restent attachées
aux activités du voyage.
