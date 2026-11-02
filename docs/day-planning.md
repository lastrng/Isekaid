# Horaires et trajets d’une journée

Dans Voyage → une journée, « Organiser les horaires » permet de régler le
début et la fin souhaités, une pause, la marge entre les visites, le mode de
transport habituel et le trajet d’arrivée dans la ville. Chaque étape permet
de préciser la durée de visite, une heure imposée, les horaires vérifiés et
le suivi d’une réservation (date, créneau, référence).

Le calcul partagé dans `daySchedule.js` remplace les 25 minutes forfaitaires :
il choisit la marche pour les lieux proches, les transports urbains ou le train
interurbain selon les distances. Ces durées sont des estimations locales,
distinctes des horaires et des itinéraires réels. Le lien Maps permet de
vérifier chaque déplacement et sa durée peut être renseignée manuellement.
Une durée renseignée est liée à l’activité de départ et aux deux lieux ; elle
n’est plus réutilisée après un déplacement ou un remplacement incompatible.
Les distances calculées restent à vol d’oiseau ; les facteurs de détour et
vitesses de calcul sont des hypothèses, jamais une distance routière mesurée.

Les plages horaires simples du catalogue, fermetures hebdomadaires explicites,
plages séparées, horaires de nuit et dernières entrées alimentent les alertes.
Les règles saisonnières, composées ou absentes restent à vérifier sur le site
du lieu. Les horaires renseignés par l’utilisateur priment pour la date
concernée. Une visite flexible attend l’ouverture ; une réservation impossible,
une visite dépassant la fermeture ou une fin de journée trop tardive est signalée.
Le calendrier des jours fériés et les fermetures exceptionnelles ne sont pas calculés.

Les réservations sont un suivi personnel, sans achat ni réservation automatique.
Un créneau réservé prime sur une ancienne heure imposée. Une réservation datée
est signalée si la visite change de jour. Les créneaux de l’utilisateur ne sont
jamais déplacés automatiquement pour masquer un conflit.

Les informations sont conservées dans `day.planning` et `activity.planning`,
dans le modèle de voyage existant. Aucun nouveau service ou schéma distant
n’est nécessaire. Les notes, photos, lieux et autres métadonnées sont préservés.
La chronologie est commune à la journée, aux totaux et aux cartes sur place
d’Aujourd’hui et Voyage ; elle fonctionne avec les données chargées hors ligne.

Vérifications : `node --test test/daySchedule.test.js`, `npm run check`, puis
`npm run qa:day-planning` avec le serveur local et Chromium de QA configurés.
