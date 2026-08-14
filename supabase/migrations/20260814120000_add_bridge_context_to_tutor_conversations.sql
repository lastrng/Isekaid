-- Pont Scénarios scriptés → Tuteur IA : contexte optionnel injecté dans le
-- system prompt de la conversation (voir tutor-chat/index.ts buildSystemPrompt).
-- Posé une seule fois, à la création de la conversation.
alter table public.tutor_conversations
  add column if not exists bridge_context text;
