# Complément des espaces produit et de la relation au Japon

Sauvegarde avant modifications : tag `backup-before-journey-completion-20260905`,
commit `e37b1762c0052e1fb04f3c3ed6f5f89bc4010169`, arbre Git propre.
Restauration non destructive dans un autre dossier :

```sh
git worktree add --detach /tmp/isekaid-before-journey-completion backup-before-journey-completion-20260905
```

## Règles métier

Les voyages datés restent prioritaires : séjour actif, départ sous 30 jours, autre
voyage futur. En leur absence, une date d'onboarding présente ou future fournit
un état de préparation et un compte à rebours, sans créer de voyage ni supposer
sa durée. Une date d'onboarding dépassée ne prouve pas qu'un séjour a eu lieu.
Un projet non annulé/non terminé sans date implique `planning`.

Un retour calculé depuis un séjour passé dure jusqu'à 90 jours après sa fin,
puis devient `japan_lover` en l'absence de nouveau projet. Ce seuil est une règle
produit explicite, exportée et testée. Un état déclaré manuellement sans voyage
ni date reste conservé, faute de preuve permettant de le dater.

Les calendriers utilisent Asia/Tokyo. Les jours sont représentés par des dates
UTC normalisées pour éviter les décalages dus au fuseau du téléphone et à l'heure
d'été. Le calcul historique de Voyager délègue au même moteur. Les dates
impossibles sont rejetées. Aucun accès GPS supplémentaire n'est introduit :
le paramètre de localisation autorisée reste disponible pour une intégration
future, et tout le fonctionnement actuel reste indépendant de cette permission.

## Expérience

L'accueil sans projet présente quatre actions : inspiration du jour, japonais,
tradition et création d'un voyage. La sélection de lieu utilise les intérêts
réels du catalogue et de l'onboarding, avec repli déterministe. Les catalogues
vides disposent d'une entrée vers Découvrir. Le tour introductif historique
reste disponible ; les anciens contenus restent accessibles par leurs espaces.

Mon Japon conserve carnet, voyages, passeport et favoris visibles. Progression
et badges, puis préférences et compte, sont regroupés dans deux volets repliables.
Les écrans japonais, scénarios, tuteur et découverte du jour gardent leurs
identifiants et affichent Découvrir comme espace parent dans la barre principale.

Voyager comporte un écran Documents et réservations, accessible depuis les outils
du voyage : références textuelles, notes/adresses, catégorie et lien HTTPS. Ajout,
édition, retrait annulable, champs bornés, états vides et erreur de sauvegarde.
Champ optionnel `trip.documents`, compatible avec les anciens voyages et transporté
par la sauvegarde locale et la synchronisation privée des voyages existantes.
Les conflits restent gérés au niveau du voyage, avec archivage existant.
Aucune pièce jointe PDF/image n'est importée ; les liens externes nécessitent
Internet. Les exports textuels et PDF existants n'incluent pas ces références.

## Validation

Tests des dates limites à Tokyo, dates invalides, départ d'onboarding, priorité
des vrais voyages, projets sans date, seuil de retour, recommandations déterministes,
catalogues vides, navigation parent, validation des références et compatibilité
avec la normalisation des voyages. `npm run check` inclut les tests existants,
la validation structurelle, l'audit de contenu et le build Vite.
Pas de test visuel sur appareil ni de déploiement dans cette étape.
