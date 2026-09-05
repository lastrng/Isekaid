-- Métadonnées séparées : les anciens clients continuent à lire trips comme
-- une liste de vrais voyages. Les politiques existantes de progress couvrent
-- cette colonne au même titre que les autres données privées du propriétaire.
alter table public.progress
  add column if not exists trip_deletions jsonb not null default '[]'::jsonb;

comment on column public.progress.trip_deletions is
  'Traces de suppression des voyages : id, deletedAt, updatedAt. Ne contient pas les notes ni les photos.';
