import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const p = await req.json();
  const { error } = await supabase.from("posts").insert({
    user_id: user.id,
    week_theme: p.week_theme ?? null,
    dia: p.dia,
    post_date: p.post_date ?? null,
    headline: p.headline,
    subtitle: p.subtitle ?? null,
    caption: p.caption ?? null,
    hashtags: p.hashtags ?? [],
    image_prompt: p.image_prompt ?? null,
    source_url: p.source_url ?? null,
    bg_url: p.bg_url ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
