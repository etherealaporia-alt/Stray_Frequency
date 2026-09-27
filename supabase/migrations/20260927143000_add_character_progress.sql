alter table public.characters
  add column if not exists progress jsonb;