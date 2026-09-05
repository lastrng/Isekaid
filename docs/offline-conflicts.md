# Synchronisation des voyages et indicateurs

## Écriture concurrente

Avant chaque envoi, le client lit `progress.trips`, `trip_deletions` et `updated_at`. Il fusionne les voyages par identifiant, puis écrit seulement si `updated_at` correspond encore à la version lue. Une concurrence provoque une nouvelle lecture, jusqu'à trois tentatives ; au-delà, la mutation reste en attente.

La dernière base synchronisée est mémorisée par compte sur l'appareil et exclue des sauvegardes générales. Lorsqu'une seule version diffère de cette base, elle est conservée. Lorsque les deux diffèrent, la date d'édition départage les versions et la version perdante est conservée localement dans les conflits du compte. Sans base, le traitement est volontairement conservateur. Il ne s'agit pas d'une fusion champ par champ ; les horloges peuvent influer sur la version choisie automatiquement.

Mon Japon affiche les copies concurrentes, leur programme et leurs notes. Restaurer une copie remplace la version actuelle en conservant aussi celle-ci. La restauration d'un voyage supprimé crée un nouvel identifiant afin de ne pas annuler sa trace de suppression. Les copies sont incluses dans la sauvegarde générale quand celle-ci peut être enregistrée ; elles restent soumises aux limites du stockage local. Les références photo sont conservées dans les snapshots, pas les fichiers distants déjà retirés du Storage.

Les changements locaux survenus pendant un envoi sont fusionnés avec sa réponse ; la file d'attente conserve les nouveaux snapshots. Les écrans Voyage et Mon Japon sont avertis d'une synchronisation réussie.

## Suppressions

Une suppression écrit une trace locale avant de retirer le voyage de l'interface. Cette trace est envoyée dans une colonne séparée `progress.trip_deletions` (`id`, `deletedAt`, `updatedAt`). Une trace prime sur une ancienne copie, même si son horloge est plus récente. La restauration d'une ancienne sauvegarde ne retire pas les traces locales.

Migration additive appliquée : `20260905170000_add_trip_deletions.sql`. Les règles RLS existantes de `progress` protègent la colonne. Les anciens clients continuent à recevoir de vrais voyages dans `trips` ; ils ne bénéficient toutefois pas des nouvelles protections avant leur mise à jour.

## Indicateurs

- Transport : seuls les préparatifs de transport cochés comptent. Une date de départ seule ne rapporte plus de points.
- Codes sociaux : proportion des préparatifs explicitement dédiés à l'étiquette (`category: codesSociaux` ou libellé correspondant) cochés. Les scénarios généraux ne prouvent plus cette préparation. La carte explique cette règle et ouvre la checklist.
- Régions : total tiré du catalogue des régions fourni, jamais du nombre de préfectures. Sans catalogue, aucun dénominateur n'est affiché.
- Jours : seuls les jours d'un voyage terminé avec au moins une activité marquée comme faite sont comptés, sous le libellé « jours avec activité ».

## Limites et restauration

Le lot ne résout pas les conflits champ par champ du profil, des favoris, de la progression ou de la sauvegarde globale. Les anciens clients peuvent encore effectuer des écritures sans comparaison de version. Les suppressions antérieures à ce lot, sans trace disponible, ne peuvent pas être reconstituées.

Point de restauration vérifié avant modification : tag `backup-before-offline-20260905` (`cab8874`). Copier l'ancien code sans écraser le travail actuel avec `git worktree add --detach /tmp/isekaid-before-offline backup-before-offline-20260905`. La colonne additive peut rester en place lors d'un rollback applicatif ; ne pas supprimer ses traces.

Validation : tests des conflits, suppressions, nouvelles tentatives, récupération locale, restauration des sauvegardes et indicateurs ; build web et audit éditorial réussis. Aucun essai sur appareil ni nouvel APK dans ce lot.
