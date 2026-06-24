# Post Studio

App web (Next.js 16) onde qualquer pessoa cria uma semana de posts de tech para o
Instagram usando as **próprias chaves** do Claude e da Luma.

```
login (Supabase) → cadastra chaves → "Gerar a semana"
  → notícias (HN + dev.to) → Claude escreve 7 posts → Luma cria a arte
  → next/og compõe o texto sobre a arte (sem layout quebrado)
  → grade com download + copiar legenda → tudo salvo no histórico
```

## Rodar local

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

O `.env.local` já está preenchido com o projeto Supabase (`post-studio`, região São Paulo).

## Como funciona

- **Auth + dados:** Supabase (Postgres + RLS). Cada usuário tem perfil (marca + chaves)
  e seu próprio histórico de posts. Um usuário nunca vê dados de outro (RLS testada).
- **Chaves:** cada usuário cadastra a sua chave do Claude e da Luma — ficam salvas só
  na conta dele e são usadas para chamar as APIs em nome dele. Custo zero pro dono do app.
- **Render:** `/api/og` usa `next/og` (Satori) para compor o texto sobre a arte da Luma,
  num template travado (1080×1350) — nunca quebra.

| rota | função |
|---|---|
| `/login` | entrar / criar conta |
| `/` | estúdio (gerar a semana) |
| `/historico` | banco de posts do usuário |
| `/api/plan` | notícias + Claude escreve os 7 posts |
| `/api/luma` | gera a arte (Photon) |
| `/api/og` | compõe o PNG final |
| `/api/profile` `/api/posts` | salvam perfil/posts no Supabase |
| `src/proxy.ts` | renova a sessão e protege as rotas (Next 16 usa `proxy`, não `middleware`) |

## Publicar na Vercel

1. Suba o projeto num repositório (GitHub) e importe na [Vercel](https://vercel.com/new).
2. Em **Settings → Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://kficzgoivlzjfqlyzxbn.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_9BHoSgEFJ89JgCtSZY2CYA_smuiar7p`
3. Deploy. Vai sair em `https://seu-projeto.vercel.app`.
4. No painel do **Supabase → Authentication → URL Configuration**: ponha a URL da Vercel
   em **Site URL** e adicione-a em **Redirect URLs** (pros links de confirmação de e-mail).

## Cadastro de usuários (importante)

A **confirmação de e-mail está LIGADA** (padrão): ao criar conta, o usuário recebe um
e-mail para confirmar antes de entrar. Para seus parentes/amigos entrarem na hora, você
pode desligar em **Supabase → Authentication → Providers → Email → "Confirm email"**
(menos seguro, porém sem fricção). Para volume real de e-mails, configure um SMTP próprio
em Authentication → Emails (o SMTP gratuito do Supabase tem limite baixo).

## Stack

Next.js 16 (App Router, Turbopack) · Tailwind v4 · Supabase (Auth + Postgres + RLS) ·
`@anthropic-ai/sdk` · Luma Dream Machine (Photon) · `next/og` (Satori).
