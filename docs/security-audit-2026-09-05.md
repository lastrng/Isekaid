# Audit Supabase et sécurité

## Contrôles vérifiés

- Les Edge Functions vérifient le bearer JWT avec `supabase.auth.getUser()` et
  utilisent l’identifiant retourné par Supabase, jamais un `userId` du corps.
- Les tables ajoutées activent RLS et bornent les lignes à `auth.uid()`.
  `premium_grants` n’a aucune écriture autorisée pour `authenticated`.
- Les fonctions Premium (`tutor-chat`, `itinerary-generate`, `carnet-render`)
  revalident RevenueCat ou le grant serveur en mode fail-closed; le booléen
  Premium local n’est jamais une autorité.
- Les secrets Anthropic, RevenueCat et service role sont lus uniquement par
  l’environnement Edge. Ils ne sont pas inclus dans les réponses ni les logs.
- La suppression de compte vérifie le JWT, supprime les photos privées, puis
  supprime l’utilisateur Admin; les FK en cascade traitent les lignes SQL.
- Les entrées sont bornées : HTML du carnet, lieux et jours d’itinéraire,
  message/pont du tuteur, scénarios et niveaux énumérés.

## Correction appliquée

La RPC de réservation de quota ne reçoit plus les limites depuis l’appelant.
`reserve_ai_usage(text)` applique 3 appels quotidiens et 20 mensuels, avec
verrou advisory par utilisateur et fonction. L’ancienne signature paramétrable
est révoquée pour `anon` et `authenticated`; seule la nouvelle signature est
exécutable par un utilisateur authentifié. Les valeurs correspondent aux
limites par défaut actuelles de `itinerary-generate`.

## Limites de l’audit

Le schéma historique de `progress` et ses politiques initiales ne sont pas
définis dans ce dépôt; ils doivent être comparés sur le projet lié avant toute
nouvelle migration. Les logs applicatifs ne consignent pas les messages du
tuteur ni les secrets, mais les erreurs fournisseurs peuvent contenir un
extrait technique limité pour le diagnostic.

Migration additive : `20260905200000_lock_ai_quota_limits.sql`. En cas de
rollback, redéployer la version précédente des Edge Functions et restaurer la
signature RPC précédente uniquement après vérification des appels existants.
