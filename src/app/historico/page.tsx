import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HistoryGrid from "@/components/HistoryGrid";

export default async function Historico() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: posts }] = await Promise.all([
    supabase.from("profiles").select("handle").eq("id", user.id).single(),
    supabase
      .from("posts")
      .select("id, dia, headline, subtitle, caption, hashtags, source_url, bg_url, week_theme, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-8">
        <span className="mono text-xs tracking-[0.2em] text-accent uppercase">Histórico</span>
        <Link href="/" className="mono text-xs text-muted hover:text-accent">
          ← voltar ao estúdio
        </Link>
      </div>

      <h1 className="text-3xl font-black tracking-tight mb-2">Seus posts</h1>
      <p className="text-muted mb-8 text-sm">
        Tudo que você já gerou fica salvo aqui — seu banco de dados de posts.
      </p>

      {!posts || posts.length === 0 ? (
        <p className="text-muted">
          Nada por aqui ainda. Gere sua primeira semana no{" "}
          <Link href="/" className="text-accent">estúdio</Link>.
        </p>
      ) : (
        <HistoryGrid posts={posts as any} handle={profile?.handle ?? "@perfil"} />
      )}
    </main>
  );
}
