# Stratégie offline

Sauvegarde vérifiée avant modification : `backup-before-offline-strategy-20260905`
(commit `94dc18fc81f8183e5ca037806d52eb750ac74471`).

## Périmètre actuel

Les voyages, journées, lieux du catalogue déjà chargé, checklist, SOS et contenus
contextuels sont accessibles depuis l’état local. La progression kana/scénarios,
profil, favoris et souvenirs sont également écrits localement avant toute
tentative cloud. Les documents PDF/images restent dans IndexedDB de l’appareil.
Le catalogue complet n’est pas recopié dans une seconde base : il est déjà livré
avec l’application et son chargement initial peut rester nécessaire.

## Écritures et synchronisation

Une modification de voyage ou de progression est d’abord sauvegardée localement.
Quand un compte est connecté, la dernière photographie de chaque domaine remplace
la précédente dans `isekaid_pending_mutations_v1`. La file est sérialisée : elle
conserve les erreurs, compte les tentatives et ne supprime pas une mutation arrivée
pendant une synchronisation. La reprise se fait au retour du réseau et à la reprise
de l’application. Les voyages utilisent une comparaison optimiste et des tombstones
de suppression ; les conflits sont archivés. La progression utilise une fusion
trois voies et archive les chemins en conflit. Les horodatages et `lastSyncedAt`
existants sont affichés par les écrans de synchronisation de profil.

`getOfflineCapabilities` décrit les huit priorités à partir des données réellement
présentes. `summarizeOfflineSync` distingue synchronisé, en attente, hors connexion
et erreur. Le Mode Japon affiche cette information et précise les limites : fonds
de carte, médias non chargés et tuteur nécessitent encore le réseau ; l’audio dépend
des voix du téléphone. La géolocalisation n’est pas nécessaire.

Cette couche reste proportionnée : aucune mise en cache arbitraire de tout le
catalogue, aucune nouvelle synchronisation de fichiers locaux, et aucune promesse
de disponibilité après effacement des données de l’application. Une file pleine
ou un stockage local indisponible est signalé par l’interface ; l’utilisateur ne
doit pas croire qu’une modification a été enregistrée si elle ne l’est pas.

Tests : capacités critiques présentes/absentes, états de synchronisation, reprise
de mutations concurrentes, conflits et suppressions existants. `npm run check`
passe avec 38 fichiers de tests, validation structurelle, audit de contenu et
build Vite. Le warning de taille du bundle demeure ; pas de validation Android
sur appareil dans cette étape.
