# Accueils avant départ et après retour

Le modèle pur `buildJourneyHome` sélectionne le séjour et les données à présenter. Le composant `JourneyHome` conserve les couleurs et les actions existantes.

- Avant départ : carte du voyage avec compte à rebours si le séjour possède une date future, panneau de préparation, entraînement aux situations et découverte liée à un lieu de l'itinéraire. Sans date, aucun compte à rebours n'est inventé. Sans séjour créé, l'action ouvre l'assistant de création existant.
- Après retour : accès au carnet ou à la confirmation du voyage, extrait d'une note du dernier séjour terminé lorsqu'elle existe, reprise du japonais, contenu relié à un lieu effectué et création d'un nouveau voyage.
- Un prochain voyage daté prime sur l'après-retour. Les voyages annulés sont exclus. Le Mode Japon conserve son accueil dédié.
- Quatre cartes principales remplacent les blocs cumulés de missions, reprise d'activité, feed, promotions et défi hebdomadaire pour ces deux contextes. Les anciennes sections restent présentes pendant le tour guidé historique et dans l'accueil découverte ; aucune fonctionnalité ni donnée n'est supprimée.
- Le panneau de préparation peut être déplié volontairement. Les recommandations utilisent le catalogue embarqué ; sans correspondance, elles ouvrent Découvrir.

Validation : `npm run check` réussi, 26 fichiers de tests. Tests des priorités, du brouillon sans date, du retour à confirmer, des souvenirs et de l'exclusion du Mode Japon/des voyages annulés. Aucun essai sur appareil ni nouvel APK pour ce lot.

Point de restauration : tag `backup-before-home-20260905`, commit `bf1bba2`. Pour créer une copie de l'état précédent sans écraser le travail courant : `git worktree add --detach /tmp/isekaid-before-home backup-before-home-20260905`.
