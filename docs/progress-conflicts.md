# Conflits du profil, des favoris et de la progression

## Fonctionnement

`saveProgress` lit les rubriques autorisées et `updated_at`, puis compare la version au moment de l'écriture. Une concurrence déclenche une nouvelle lecture, jusqu'à trois tentatives. Un échec laisse la mutation dans la file existante. Les colonnes de voyages et l'identifiant utilisateur ne peuvent pas être fournis par le snapshot de progression.

La fusion compare trois versions : dernière base synchronisée sur cet appareil, snapshot local et données distantes. Les modifications de champs distincts sont réunies. Les tableaux identifiables (favoris, étapes terminées, intérêts) réunissent les ajouts ; un retrait par rapport à la base est conservé. Sans base, une absence n'est pas considérée comme une suppression. La liste distante de favoris vide est désormais appliquée au chargement.

Les enregistrements de révision d'un même kana restent indivisibles : le plus récent selon `last` est utilisé. Les séries de jours restent également indivisibles. Aucun compteur de deux appareils n'est additionné arbitrairement. Les missions de dates différentes utilisent la journée la plus récente. Pour les autres conflits d'une même valeur, la valeur locale est prioritaire et les copies sont conservées.

Quand les versions sont incompatibles, les snapshots local et distant sont archivés par compte avant l'écriture. Si l'archivage échoue faute de place, l'envoi n'est pas déclaré réussi. Ces copies apparaissent dans Mon Japon ; une rubrique peut être restaurée, en conservant d'abord la version actuelle, ou la copie peut être exportée en JSON. La sauvegarde générale inclut les copies mais exclut les bases techniques de synchronisation.

Une réponse réseau met à jour les états React et leur persistance existante. La fusion avec le snapshot envoyé préserve les changements supplémentaires intervenus pendant l'attente. Les anciens profils passent par la normalisation existante. Les données reçues pour un autre compte ne sont pas appliquées à l'écran courant.

## Limites

Les nouvelles protections dépendent du client mis à jour. Sans base historique disponible, un ancien retrait de favori ne peut pas être reconstitué. Les révisions concurrentes du même kana ne sont pas fusionnées comme des événements : leurs copies restent disponibles. L'archive est locale et dépend des limites du stockage et de la réussite des sauvegardes.

La sauvegarde globale `user_backups` reste un snapshot distinct, sans fusion exhaustive de toutes les clés locales. Les droits Premium continuent d'être validés par les mécanismes serveur existants ; ce lot n'ajoute aucun droit via les copies de progression.

## Vérification et restauration

`npm run check` réussi : 30 fichiers de tests, audit éditorial et build web. Tests ajoutés pour les profils, favoris ajoutés/retirés, absence de base, cohérence des kana, modifications pendant l'envoi, missions, liste de colonnes, reprises après concurrence et échec de stockage. Aucun essai sur appareil dans ce lot.

Tag préalable vérifié : `backup-before-progress-sync-20260905` (`3026e19`). Copie indépendante possible avec `git worktree add --detach /tmp/isekaid-before-progress-sync backup-before-progress-sync-20260905`. Aucune nouvelle migration ni modification de fonction serveur.
