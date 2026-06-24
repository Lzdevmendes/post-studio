"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pollinationsUrl, ART_STYLES, type ArtStyle } from "@/lib/pollinations";
import type { Plan, Post } from "@/lib/types";

type Template = "padrao" | "centro" | "citacao";
const TEMPLATES: { id: Template; label: string }[] = [
  { id: "padrao", label: "Padrão — manchete embaixo" },
  { id: "centro", label: "Centralizado" },
  { id: "citacao", label: "Citação" },
];

type TextProvider = "pollinations" | "gemini" | "groq" | "openrouter" | "claude";
type ImageProvider = "pollinations" | "huggingface" | "cloudflare" | "luma";

type Settings = {
  handle: string;
  niche: string;
  textProvider: TextProvider;
  imageProvider: ImageProvider;
  anthropicKey: string;
  geminiKey: string;
  lumaKey: string;
  model: string;
};

// Chaves dos motores grátis novos — guardadas só na sessão (sem coluna no
// banco ainda). Persisti-las exige uma migração no Supabase.
type FreeKeys = {
  groqKey: string;
  openrouterKey: string;
  hfKey: string;
  cfAccountId: string;
  cfToken: string;
};

type GenPost = Post & {
  bg?: string;
  artUrl?: string;
  status: "pending" | "art" | "done" | "error";
  error?: string;
};

const DIAS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

export default function Studio({ email, initial }: { email: string; initial: Settings }) {
  const router = useRouter();
  const supabase = createClient();
  const [settings, setSettings] = useState<Settings>(initial);
  const [showKeys, setShowKeys] = useState(false);
  const [running, setRunning] = useState(false);
  const [theme, setTheme] = useState("");
  const [posts, setPosts] = useState<GenPost[]>([]);
  const [error, setError] = useState("");
  const [artStyle, setArtStyle] = useState<ArtStyle>("abstrato");
  const [template, setTemplate] = useState<Template>("padrao");
  const [freeKeys, setFreeKeys] = useState<FreeKeys>({
    groqKey: "",
    openrouterKey: "",
    hfKey: "",
    cfAccountId: "",
    cfToken: "",
  });

  const textReady =
    settings.textProvider === "pollinations"
      ? true
      : settings.textProvider === "gemini"
        ? !!settings.geminiKey
        : settings.textProvider === "groq"
          ? !!freeKeys.groqKey
          : settings.textProvider === "openrouter"
            ? !!freeKeys.openrouterKey
            : !!settings.anthropicKey;
  const imageReady =
    settings.imageProvider === "pollinations"
      ? true
      : settings.imageProvider === "huggingface"
        ? !!freeKeys.hfKey
        : settings.imageProvider === "cloudflare"
          ? !!freeKeys.cfAccountId && !!freeKeys.cfToken
          : !!settings.lumaKey;
  const ready = textReady && imageReady;
  const [openSettings, setOpenSettings] = useState(!ready);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setSettings((s) => ({ ...s, [k]: v }));
  }

  function setFree<K extends keyof FreeKeys>(k: K, v: FreeKeys[K]) {
    setFreeKeys((s) => ({ ...s, [k]: v }));
  }

  async function persist() {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: settings.handle,
        niche: settings.niche,
        model: settings.model,
        text_provider: settings.textProvider,
        image_provider: settings.imageProvider,
        anthropic_key: settings.anthropicKey,
        gemini_key: settings.geminiKey,
        luma_key: settings.lumaKey,
      }),
    });
  }

  async function savePost(p: GenPost) {
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        week_theme: theme,
        dia: p.dia,
        headline: p.headline,
        subtitle: p.subtitle,
        caption: p.caption,
        hashtags: p.hashtags,
        image_prompt: p.image_prompt,
        source_url: p.source_url,
        // Só URLs hospedadas voltam a renderizar no histórico; data URIs
        // (Hugging Face / Cloudflare) são grandes demais para guardar.
        bg_url: p.bg?.startsWith("http") ? p.bg : null,
      }),
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function generate() {
    setError("");
    setPosts([]);
    setTheme("");
    setRunning(true);
    try {
      const planRes = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.textProvider,
          anthropicKey: settings.anthropicKey,
          geminiKey: settings.geminiKey,
          freeKey:
            settings.textProvider === "groq"
              ? freeKeys.groqKey
              : settings.textProvider === "openrouter"
                ? freeKeys.openrouterKey
                : "",
          model: settings.textProvider === "claude" ? settings.model : undefined,
          handle: settings.handle,
          niche: settings.niche,
        }),
      });
      const plan: Plan & { error?: string } = await planRes.json();
      if (!planRes.ok) throw new Error(plan.error || "Falha ao montar os posts");

      setTheme(plan.week_theme);
      const initialPosts: GenPost[] = plan.days.slice(0, 7).map((d, i) => ({
        ...d,
        dia: DIAS[i],
        status: "pending",
      }));
      setPosts(initialPosts);

      for (let i = 0; i < initialPosts.length; i++) {
        setPosts((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: "art" } : p)));
        try {
          const post = initialPosts[i];
          let bg: string;
          if (settings.imageProvider === "pollinations") {
            bg = pollinationsUrl(post.image_prompt, i + 1, artStyle);
          } else if (settings.imageProvider === "luma") {
            const lumaRes = await fetch("/api/luma", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lumaKey: settings.lumaKey, prompt: post.image_prompt }),
            });
            const luma = await lumaRes.json();
            if (!lumaRes.ok) throw new Error(luma.error || "Luma falhou");
            bg = luma.url;
          } else {
            // huggingface / cloudflare devolvem bytes -> data URI
            const imgRes = await fetch("/api/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: settings.imageProvider,
                prompt: post.image_prompt,
                hfKey: freeKeys.hfKey,
                cfAccountId: freeKeys.cfAccountId,
                cfToken: freeKeys.cfToken,
              }),
            });
            const img = await imgRes.json();
            if (!imgRes.ok) throw new Error(img.error || "Falha ao gerar a imagem");
            bg = img.dataUri;
          }

          // Compõe a arte no servidor (POST aceita data URI grande no corpo).
          const ogRes = await fetch("/api/og", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              headline: post.headline,
              subtitle: post.subtitle,
              dia: post.dia,
              handle: settings.handle,
              bg,
              tpl: template,
            }),
          });
          if (!ogRes.ok) throw new Error("Falha ao compor a arte");
          const artUrl = URL.createObjectURL(await ogRes.blob());

          const done: GenPost = { ...post, bg, artUrl, status: "done" };
          setPosts((prev) => prev.map((p, idx) => (idx === i ? done : p)));
          savePost(done);
        } catch (e: any) {
          setPosts((prev) =>
            prev.map((p, idx) => (idx === i ? { ...p, status: "error", error: e?.message } : p)),
          );
        }
      }
    } catch (e: any) {
      setError(e?.message || "Algo deu errado");
    } finally {
      setRunning(false);
    }
  }

  function download(p: GenPost) {
    if (!p.artUrl) return;
    const a = document.createElement("a");
    a.href = p.artUrl;
    a.download = `post-${p.dia}.png`;
    a.click();
  }

  const doneCount = posts.filter((p) => p.status === "done").length;
  const free = settings.textProvider !== "claude" && settings.imageProvider !== "luma";

  return (
    <div className="w-full max-w-5xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-8">
        <span className="mono text-xs tracking-[0.2em] text-accent uppercase">Post Studio</span>
        <div className="flex items-center gap-4">
          <Link href="/historico" className="mono text-xs text-muted hover:text-accent">histórico</Link>
          <span className="mono text-xs text-muted hidden sm:inline">{email}</span>
          <button onClick={signOut} className="mono text-xs text-muted hover:text-accent">sair</button>
        </div>
      </div>

      <header className="mb-8">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
          Uma semana de posts de tech,
          <br />
          <span className="text-accent">gerada no automático.</span>
        </h1>
        <p className="text-muted mt-4 max-w-xl">
          Puxamos as notícias da semana, a IA escreve 7 posts com a sua voz, gera a
          arte e o texto é montado por código — sem layout quebrado.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-surface/70 backdrop-blur p-4 sm:p-5 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${ready ? "bg-accent" : "bg-yellow-400"}`} />
            <span className="text-sm">
              {ready ? (free ? "Pronto — modo grátis" : "Tudo configurado") : "Escolha os motores e cadastre as chaves"}
            </span>
          </div>
          <button
            onClick={() => setOpenSettings((v) => !v)}
            className="mono text-xs px-3 py-2 rounded-lg border border-border hover:border-accent transition-colors"
          >
            {openSettings ? "fechar" : "configurar"}
          </button>
        </div>

        {openSettings && (
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            {/* Motor de TEXTO */}
            <Field label="Motor de texto" hint="Pollinations não precisa de chave · Claude é pago (melhor escrita)">
              <select value={settings.textProvider} onChange={(e) => set("textProvider", e.target.value as TextProvider)} onBlur={persist} className="input">
                <option value="pollinations">Pollinations — grátis, sem chave</option>
                <option value="gemini">Gemini — grátis (chave grátis)</option>
                <option value="groq">Groq — grátis (chave grátis)</option>
                <option value="openrouter">OpenRouter — grátis (chave grátis)</option>
                <option value="claude">Claude — pago</option>
              </select>
            </Field>
            {settings.textProvider === "pollinations" ? (
              <div className="hidden sm:block" />
            ) : settings.textProvider === "gemini" ? (
              <Field label="Chave do Gemini (grátis)" hint="aistudio.google.com → Get API key">
                <input type={showKeys ? "text" : "password"} value={settings.geminiKey} onChange={(e) => set("geminiKey", e.target.value)} onBlur={persist} placeholder="AIza..." className="input" />
              </Field>
            ) : settings.textProvider === "groq" ? (
              <Field label="Chave do Groq (grátis)" hint="console.groq.com → API Keys">
                <input type={showKeys ? "text" : "password"} value={freeKeys.groqKey} onChange={(e) => setFree("groqKey", e.target.value)} placeholder="gsk_..." className="input" />
              </Field>
            ) : settings.textProvider === "openrouter" ? (
              <Field label="Chave do OpenRouter (grátis)" hint="openrouter.ai → Keys · usa modelos :free">
                <input type={showKeys ? "text" : "password"} value={freeKeys.openrouterKey} onChange={(e) => setFree("openrouterKey", e.target.value)} placeholder="sk-or-..." className="input" />
              </Field>
            ) : (
              <Field label="Chave do Claude (Anthropic)" hint="console.claude.com → API keys (precisa de créditos)">
                <input type={showKeys ? "text" : "password"} value={settings.anthropicKey} onChange={(e) => set("anthropicKey", e.target.value)} onBlur={persist} placeholder="sk-ant-..." className="input" />
              </Field>
            )}

            {/* Motor de IMAGEM */}
            <Field label="Motor de imagem" hint="Pollinations não precisa de chave · Luma é paga (mais polida)">
              <select value={settings.imageProvider} onChange={(e) => set("imageProvider", e.target.value as ImageProvider)} onBlur={persist} className="input">
                <option value="pollinations">Pollinations — grátis, sem chave</option>
                <option value="huggingface">Hugging Face FLUX — grátis (chave grátis)</option>
                <option value="cloudflare">Cloudflare FLUX — grátis (chave grátis)</option>
                <option value="luma">Luma (UNI) — paga</option>
              </select>
            </Field>
            {settings.imageProvider === "luma" ? (
              <Field label="Chave da Luma (UNI)" hint="lumalabs.ai → API keys">
                <input type={showKeys ? "text" : "password"} value={settings.lumaKey} onChange={(e) => set("lumaKey", e.target.value)} onBlur={persist} placeholder="luma-..." className="input" />
              </Field>
            ) : settings.imageProvider === "huggingface" ? (
              <Field label="Token do Hugging Face (grátis)" hint="huggingface.co/settings/tokens">
                <input type={showKeys ? "text" : "password"} value={freeKeys.hfKey} onChange={(e) => setFree("hfKey", e.target.value)} placeholder="hf_..." className="input" />
              </Field>
            ) : settings.imageProvider === "cloudflare" ? (
              <>
                <Field label="Account ID do Cloudflare" hint="dash.cloudflare.com → Workers AI">
                  <input value={freeKeys.cfAccountId} onChange={(e) => setFree("cfAccountId", e.target.value)} placeholder="ex.: 0a1b2c..." className="input" />
                </Field>
                <Field label="API Token do Cloudflare (grátis)" hint="permissão Workers AI">
                  <input type={showKeys ? "text" : "password"} value={freeKeys.cfToken} onChange={(e) => setFree("cfToken", e.target.value)} placeholder="token..." className="input" />
                </Field>
              </>
            ) : (
              <div className="hidden sm:block" />
            )}

            {/* Estilo de arte — grátis, sem chave (só no Pollinations) */}
            {settings.imageProvider === "pollinations" && (
              <Field label="Estilo da arte" hint="Grátis · muda o visual do fundo">
                <select value={artStyle} onChange={(e) => setArtStyle(e.target.value as ArtStyle)} className="input">
                  {ART_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </Field>
            )}

            {/* Template do post — layout do texto, 100% código */}
            <Field label="Template do post" hint="Como o texto é diagramado">
              <select value={template} onChange={(e) => setTemplate(e.target.value as Template)} className="input">
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </Field>

            {settings.textProvider === "claude" && (
              <Field label="Modelo do Claude" hint="Haiku = mais barato · Opus = melhor">
                <select value={settings.model} onChange={(e) => set("model", e.target.value)} onBlur={persist} className="input">
                  <option value="claude-haiku-4-5">Haiku 4.5 — mais barato</option>
                  <option value="claude-sonnet-4-6">Sonnet 4.6 — equilíbrio</option>
                  <option value="claude-opus-4-8">Opus 4.8 — melhor escrita</option>
                </select>
              </Field>
            )}

            <Field label="Seu @ no Instagram">
              <input value={settings.handle} onChange={(e) => set("handle", e.target.value)} onBlur={persist} className="input" />
            </Field>
            <Field label="Nicho / tema do perfil">
              <input value={settings.niche} onChange={(e) => set("niche", e.target.value)} onBlur={persist} className="input" />
            </Field>

            <label className="mono text-xs text-muted flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={showKeys} onChange={(e) => setShowKeys(e.target.checked)} />
              mostrar chaves
            </label>
            <p className="text-xs text-muted sm:col-span-2">
              Modo 100% sem chave: Pollinations no texto + Pollinations na imagem — não
              precisa cadastrar nada. Gemini, Groq, OpenRouter, Hugging Face e Cloudflare
              também são grátis (só pedem uma chave grátis). Chaves do Claude/Gemini/Luma
              ficam salvas na sua conta; as dos motores grátis novos valem só nesta sessão.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mb-8">
        <button onClick={generate} disabled={!ready || running} className="px-6 py-3 rounded-xl font-semibold bg-accent text-[#0b0d12] hover:bg-[var(--accent-press)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {running ? "Gerando…" : "Gerar a semana"}
        </button>
        {posts.length > 0 && <span className="mono text-xs text-muted">{doneCount}/{posts.length} prontos</span>}
      </div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 p-4 mb-6 text-sm">{error}</div>}

      {theme && (
        <div className="mb-5">
          <span className="mono text-xs text-muted uppercase tracking-widest">tema da semana</span>
          <p className="text-lg">{theme}</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {posts.map((p, i) => (
          <article key={i} className="rounded-2xl border border-border bg-surface overflow-hidden flex flex-col">
            <div className="aspect-[4/5] bg-surface-2 relative">
              {p.status === "done" && p.artUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.artUrl} alt={p.headline} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center mono text-xs text-muted">
                  {p.status === "art" && <Spinner label={`gerando ${p.dia}…`} />}
                  {p.status === "pending" && <span>na fila</span>}
                  {p.status === "error" && <span className="text-red-400 px-3 text-center">erro: {p.error}</span>}
                </div>
              )}
            </div>
            <div className="p-4 flex flex-col gap-3 flex-1">
              <div className="flex items-center justify-between">
                <span className="mono text-[11px] uppercase tracking-widest text-accent">{p.dia}</span>
                {p.source_url && (
                  <a href={p.source_url} target="_blank" rel="noreferrer" className="mono text-[11px] text-muted hover:text-accent">fonte ↗</a>
                )}
              </div>
              <p className="text-sm whitespace-pre-line text-foreground/90 line-clamp-5">{p.caption}</p>
              <div className="mt-auto flex gap-2">
                <button onClick={() => download(p)} disabled={p.status !== "done"} className="mono text-xs px-3 py-2 rounded-lg border border-border hover:border-accent disabled:opacity-40 transition-colors">baixar arte</button>
                <button onClick={() => navigator.clipboard.writeText(p.caption + "\n\n" + p.hashtags.map((h) => "#" + h).join(" "))} className="mono text-xs px-3 py-2 rounded-lg border border-border hover:border-accent transition-colors">copiar legenda</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-foreground/80">{label}</span>
      {children}
      {hint && <span className="mono text-[10px] text-muted">{hint}</span>}
    </label>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="w-3 h-3 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      {label}
    </span>
  );
}
