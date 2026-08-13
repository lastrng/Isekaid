-- Phase 3 : tuteur conversationnel — tables + RLS stricte (chaque user ne
-- lit/écrit que ses propres conversations et messages).
--
-- Déjà appliquée directement au projet Supabase (rocttuyhzkhjdkxvtvon) le
-- 2026-08-13. Ce fichier documente ce qui est réellement en base, pour que
-- `supabase db pull`/toute nouvelle installation reste reproductible.

create table if not exists public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario text not null default 'free',
  titre text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content_jp text,
  content_fr text,
  romaji text,
  correction text,
  created_at timestamptz not null default now()
);

create index if not exists tutor_conversations_user_idx
  on public.tutor_conversations (user_id, updated_at desc);

create index if not exists tutor_messages_conv_idx
  on public.tutor_messages (conversation_id, created_at);

-- Remonte updated_at sur la conversation à chaque nouveau message, pour
-- trier l'historique par activité récente sans y penser côté app.
create or replace function public.touch_tutor_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tutor_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists tutor_messages_touch on public.tutor_messages;
create trigger tutor_messages_touch
  after insert on public.tutor_messages
  for each row execute function public.touch_tutor_conversation();

alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;

create policy "Users manage own tutor conversations"
  on public.tutor_conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own tutor messages"
  on public.tutor_messages
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
