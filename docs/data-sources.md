# Sources de vérité et contrat de données

| Domaine | Source de vérité locale | Synchronisation cloud | Exposition client |
| --- | --- | --- | --- |
| Profil et réglages | namespaces `profile`, `settings` | colonnes correspondantes de `progress` | lecture du propriétaire uniquement |
| Favoris | `isekaid_favs_v1` | `progress.favorites` | éléments choisis par l’utilisateur |
| Kana, scénarios, parcours | namespaces dédiés | `progress.kana_progress`, `scenarios`, `path` | progression de l’utilisateur |
| Voyages | `isekaid_trips_v1` + traces de suppression | `progress.trips` et `trip_deletions` | voyages du propriétaire |
| Photos de souvenirs | références dans les activités | bucket `memory-photos` | URL signée à la demande |
| Catalogue éditorial | `japan-data.json` et données éditoriales | aucune | contenu public embarqué |
| Conversations | historique local d’écran | `tutor_messages` / `tutor_conversations` | conversation du propriétaire |

`progress` est le conteneur cloud historique, mais chaque domaine conserve sa
forme locale et ses règles de fusion. Les migrations présentes sont additives
(`trip_deletions`, `user_backups`, photos, découvertes, quotas) ; aucune
migration ne remplace une donnée utilisateur existante.

## Lecture minimale

`fetchProgress` sélectionne explicitement les colonnes de profil, progression
et réglages. Les voyages utilisent `fetchTrips` avec seulement `trips` et
`trip_deletions`; les conversations et les sauvegardes filtrent par
`user_id`. Le catalogue public n’est jamais mélangé aux données privées.

Le schéma historique de `progress` n’étant pas défini dans ce dépôt, aucune
nouvelle colonne ni politique RLS n’est ajoutée ici. Avant toute évolution SQL,
il faut comparer le schéma distant, ses politiques et les versions clientes,
puis fournir une migration additive et un rollback documenté. Les tags de
sauvegarde Git constituent les points de restauration du code; les données
utilisateur restent protégées par les snapshots et la file de synchronisation
existants.
