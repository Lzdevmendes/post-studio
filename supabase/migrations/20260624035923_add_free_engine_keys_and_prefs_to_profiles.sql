-- Persiste as chaves dos motores grátis novos (Groq, OpenRouter, Hugging Face,
-- Cloudflare) e as preferências de estilo de arte / template no perfil.
-- RLS já existente na tabela cobre estas colunas (políticas são por linha).
alter table public.profiles
  add column if not exists groq_key text,
  add column if not exists openrouter_key text,
  add column if not exists hf_key text,
  add column if not exists cf_account_id text,
  add column if not exists cf_token text,
  add column if not exists art_style text,
  add column if not exists template text;
