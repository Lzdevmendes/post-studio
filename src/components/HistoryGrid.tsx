"use client";

type SavedPost = {
  id: string;
  dia: string;
  headline: string;
  subtitle: string | null;
  caption: string | null;
  hashtags: string[] | null;
  source_url: string | null;
  bg_url: string | null;
  created_at: string;
};

function ogUrl(p: SavedPost, handle: string) {
  const q = new URLSearchParams({
    headline: p.headline,
    subtitle: p.subtitle ?? "",
    dia: p.dia,
    handle,
    bg: p.bg_url ?? "",
  });
  return `/api/og?${q.toString()}`;
}

export default function HistoryGrid({
  posts,
  handle,
}: {
  posts: SavedPost[];
  handle: string;
}) {
  async function download(p: SavedPost) {
    const res = await fetch(ogUrl(p, handle));
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `post-${p.dia}-${p.id.slice(0, 6)}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {posts.map((p) => (
        <article key={p.id} className="rounded-2xl border border-border bg-surface overflow-hidden flex flex-col">
          <div className="aspect-[4/5] bg-surface-2">
            {p.bg_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ogUrl(p, handle)} alt={p.headline} className="w-full h-full object-cover" />
            ) : null}
          </div>
          <div className="p-4 flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between">
              <span className="mono text-[11px] uppercase tracking-widest text-accent">{p.dia}</span>
              <span className="mono text-[10px] text-muted">
                {new Date(p.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <p className="text-sm whitespace-pre-line text-foreground/90 line-clamp-4">{p.caption}</p>
            <div className="mt-auto flex gap-2">
              <button onClick={() => download(p)} className="mono text-xs px-3 py-2 rounded-lg border border-border hover:border-accent transition-colors">
                baixar arte
              </button>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    (p.caption ?? "") + "\n\n" + (p.hashtags ?? []).map((h) => "#" + h).join(" "),
                  )
                }
                className="mono text-xs px-3 py-2 rounded-lg border border-border hover:border-accent transition-colors"
              >
                copiar legenda
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
