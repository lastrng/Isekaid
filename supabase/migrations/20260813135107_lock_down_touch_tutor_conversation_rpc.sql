-- Une fonction SECURITY DEFINER reçoit par défaut EXECUTE pour PUBLIC en
-- Postgres. touch_tutor_conversation() ne vérifie pas la propriété de la
-- conversation (elle fait confiance au trigger qui l'appelle avec un
-- conversation_id de confiance) — appelable directement en RPC, n'importe
-- quel utilisateur authentifié pourrait toucher updated_at d'une conversation
-- qui n'est pas la sienne. On retire ce droit : la fonction ne reste
-- exécutable que par le trigger lui-même (propriétaire).
revoke execute on function public.touch_tutor_conversation() from public;
revoke execute on function public.touch_tutor_conversation() from anon, authenticated;
