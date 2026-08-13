-- Découvertes Japon quotidiennes pour la section Explorer — table + bucket
-- Storage pour les photos Wikimedia. RLS : lecture publique, écriture
-- uniquement via service_role (pipeline VPS /opt/isekaid-explore), même
-- pattern que app_feed.

create table if not exists public.explore_discoveries (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  slug               text not null unique,
  category           text not null,
  title              text not null,
  subtitle           text,
  body               text,
  kanji              text,
  romaji             text,
  image_url          text,
  image_attribution  text,
  image_licence      text,
  image_source_url   text,
  published_at       timestamptz,
  meta               jsonb default '{}'::jsonb
);

create index if not exists explore_discoveries_published_idx
  on public.explore_discoveries (published_at desc);
create index if not exists explore_discoveries_category_idx
  on public.explore_discoveries (category);

alter table public.explore_discoveries enable row level security;

create policy "Lecture publique des découvertes"
  on public.explore_discoveries
  for select
  using (true);

-- Bucket public pour les photos (mêmes conventions que social-assets : pas
-- de policy storage.objects dédiée, le flag public=true suffit pour la
-- lecture via getPublicUrl ; l'écriture se fait via service_role côté script).
insert into storage.buckets (id, name, public)
values ('explore-assets', 'explore-assets', true)
on conflict (id) do nothing;
