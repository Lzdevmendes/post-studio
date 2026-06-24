"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { pollinationsUrl } from "@/lib/pollinations";
import type { Plan, Post } from "@/lib/types";

type Settings = {
  handle: string;
  niche: string;
  textProvider: "gemini" | "claude";
  imageProvider: "pollinations" | "luma";
  anthropicKey: string;
  geminiKey: string;
  lumaKey: string;
  model: string;
};

type GenPost = Post & {
  bg?: string;
  ogUrl?: string;
  status: "pending" | "art" | "done" | "error";
  error?: string;
};

const DIAS = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

function ogUrl(p: { headline: string; subtitle: string; dia: string }, handle: string, bg: string) {
  const q = new URLSearchParams({ headline: p.headline, subtitle: p.subtitle, dia: p.dia, handle, bg });
  return `/api/og?${q.toString()}`;
}

export default function Studio({ email, initial }: { email: string; initial: Settings }) {
  const router = useRouter();
  const supabase = createClient();
  const [settings, setSettings] = useState<Settings>(initial);
  const [showKeys, setShowKeys] = useState(false);
  const [running, setRunning] = useState(false);
  const [theme, setTheme] = useState("");
  const [posts, setPosts] = useState<GenPost[]>([]);
  const [error, setError] = useState("");

  const textReady = settings.textProvider === "gemini" ? !!settings.geminiKey : !!settings.anthropicKey;
  const imageReady = settings.imageProvider === "pollinations" ? true : !!settings.lumaKey;
  const ready = textReady && imageReady;
  const [openSettings, setOpenSettings] = useState(!ready);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setSettings((s) => ({ ...s, [k]: v }));
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
        bg_url: p.bg,
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
          model: settings.model,
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
          let bg: string;
          if (settings.imageProvider === "pollinations") {
            bg = pollinationsUrl(initialPosts[i].image_prompt, i + 1);
          } else {
            const lumaRes = await fetch("/api/luma", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lumaKey: settings.lumaKey, prompt: initialPosts[i].image_prompt }),
            });
            const luma = await lumaRes.json();
            if (!lumaRes.ok) throw new Error(luma.error || "Luma falhou");
            bg = luma.url;
          }
          const done: GenPost = {
            ...initialPosts[i],
            bg,
            ogUrl: ogUrl(initialPosts[i], settings.handle, bg),
            status: "done",
          };
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

  async function download(p: GenPost) {
    if (!p.ogUrl) return;
    const res = await fetch(p.ogUrl);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `post-${p.dia}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const doneCount = posts.filter((p) => p.status === "done").length;
  const free = settings.textProvider === "gemini" && settings.imageProvider === "pollinations";

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
            <Field label="Motor de texto" hint="Gemini é grátis · Claude é pago (melhor escrita)">
              <select value={settings.textProvider} onChange={(e) => set("textProvider", e.target.value as Settings["textProvider"])} onBlur={persist} className="input">
                <option value="gemini">Gemini — grátis</option>
                <option value="claude">Claude — pago</option>
              </select>
            </Field>
            {settings.textProvider === "gemini" ? (
              <Field label="Chave do Gemini (grátis)" hint="aistudio.google.com → Get API key">
                <input type={showKeys ? "text" : "password"} value={settings.geminiKey} onChange={(e) => set("geminiKey", e.target.value)} onBlur={persist} placeholder="AIza..." className="input" />
              </Field>
            ) : (
              <Field label="Chave do Claude (Anthropic)" hint="console.claude.com → API keys (precisa de créditos)">
                <input type={showKeys ? "text" : "password"} value={settings.anthropicKey} onChange={(e) => set("anthropicKey", e.target.value)} onBlur={persist} placeholder="sk-ant-..." className="input" />
              </Field>
            )}

            {/* Motor de IMAGEM */}
            <Field label="Motor de imagem" hint="Pollinations é grátis · Luma é paga (mais polida)">
              <select value={settings.imageProvider} onChange={(e) => set("imageProvider", e.target.value as Settings["imageProvider"])} onBlur={persist} className="input">
                <option value="pollinations">Pollinations — grátis</option>
                <option value="luma">Luma (UNI) — paga</option>
              </select>
            </Field>
            {settings.imageProvider === "luma" ? (
              <Field label="Chave da Luma (UNI)" hint="lumalabs.ai → API keys">
                <input type={showKeys ? "text" : "password"} value={settings.lumaKey} onChange={(e) => set("lumaKey", e.target.value)} onBlur={persist} placeholder="luma-..." className="input" />
              </Field>
            ) : (
              <div className="hidden sm:block" />
            )}

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
              No modo grátis (Gemini + Pollinations) você não paga nada — só precisa de
              uma chave grátis do Gemini. Suas chaves ficam salvas só na sua conta.
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
              {p.status === "done" && p.ogUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.ogUrl} alt={p.headline} className="w-full h-full object-cover" />
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
