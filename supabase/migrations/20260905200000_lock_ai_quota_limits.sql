-- Les anciennes limites étaient des paramètres de reserve_ai_usage(). Un appel
-- PostgREST authentifié pouvait donc demander des plafonds plus élevés que
-- ceux utilisés par l'Edge Function. Cette RPC fixe les limites au serveur.
create or replace function public.reserve_ai_usage(p_feature text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  daily_used int;
  monthly_used int;
  daily_limit constant int := 3;
  monthly_limit constant int := 20;
begin
  if uid is null or p_feature <> 'itinerary' then raise exception 'not_allowed'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_feature, 0));
  select count(*) into daily_used from public.ai_usage where user_id=uid and feature=p_feature and created_at>=date_trunc('day',now() at time zone 'utc');
  select count(*) into monthly_used from public.ai_usage where user_id=uid and feature=p_feature and created_at>=date_trunc('month',now() at time zone 'utc');
  if daily_used>=daily_limit or monthly_used>=monthly_limit then
    return jsonb_build_object('allowed',false,'dailyUsed',daily_used,'dailyLimit',daily_limit,'monthlyUsed',monthly_used,'monthlyLimit',monthly_limit);
  end if;
  insert into public.ai_usage(user_id,feature) values(uid,p_feature);
  return jsonb_build_object('allowed',true,'dailyUsed',daily_used+1,'dailyLimit',daily_limit,'monthlyUsed',monthly_used+1,'monthlyLimit',monthly_limit);
end;
$$;

-- L'ancienne signature ne doit plus être appelable par un rôle utilisateur.
revoke all on function public.reserve_ai_usage(text,int,int) from public, anon, authenticated;
revoke all on function public.reserve_ai_usage(text) from public, anon;
grant execute on function public.reserve_ai_usage(text) to authenticated;
