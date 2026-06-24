import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  for (const k of [
    "handle",
    "niche",
    "anthropic_key",
    "luma_key",
    "model",
    "text_provider",
    "image_provider",
    "gemini_key",
  ]) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  patch.updated_at = new Date().toISOString();

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
