"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setMsg("Conta criada! Confirme o e-mail que enviamos para entrar.");
        }
      }
    } catch (err: any) {
      setMsg(err?.message || "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mono text-xs tracking-[0.2em] text-accent uppercase mb-3">
          Post Studio
        </div>
        <h1 className="text-3xl font-black tracking-tight mb-1">
          {mode === "in" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="text-muted text-sm mb-6">
          Crie posts de tech para o seu Instagram com as suas próprias chaves.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            className="input"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="senha (mín. 6)"
            className="input"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-3 rounded-xl font-semibold bg-accent text-[#0b0d12] hover:bg-[var(--accent-press)] disabled:opacity-40 transition-colors"
          >
            {busy ? "..." : mode === "in" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {msg && <p className="text-sm text-muted mt-4">{msg}</p>}

        <button
          onClick={() => {
            setMode((m) => (m === "in" ? "up" : "in"));
            setMsg("");
          }}
          className="mono text-xs text-muted hover:text-accent mt-6"
        >
          {mode === "in"
            ? "não tem conta? criar uma →"
            : "já tem conta? entrar →"}
        </button>
      </div>
    </main>
  );
}
