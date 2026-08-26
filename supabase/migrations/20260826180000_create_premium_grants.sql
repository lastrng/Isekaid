-- Statut Premium accordé via code d'accès (invités), vérifiable côté serveur.
--
-- Avant cette table, le code d'invitation (ACCESS_CODE dans App.jsx) était
-- validé uniquement côté client et stocké en localStorage : l'UI affichait
-- "Premium" partout, mais les Edge Functions gating (itinerary-generate,
-- tutor-chat, carnet-render) ne connaissent QUE RevenueCat — un utilisateur
-- passé Premium par code se faisait donc refuser "premium_required" par le
-- serveur alors que le client le disait Premium. Cette table donne au code
-- d'accès une source de vérité serveur, au même titre que RevenueCat.
--
-- Écriture réservée à service_role (Edge Function redeem-premium-code, seule
-- à connaître le code secret et à vérifier le JWT) : aucune policy insert/
-- update/delete pour authenticated, sinon n'importe quel utilisateur pourrait
-- s'auto-déclarer Premium par une simple requête PostgREST.
create table if not exists public.premium_grants (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  source     text not null default 'access_code' check (source in ('access_code')),
  granted_at timestamptz not null default now()
);

alter table public.premium_grants enable row level security;

create policy "Lecture de son propre statut premium"
  on public.premium_grants
  for select
  using (auth.uid() = user_id);
