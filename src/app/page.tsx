import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Studio from "@/components/Studio";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, niche, anthropic_key, luma_key, gemini_key, model, text_provider, image_provider")
    .eq("id", user.id)
    .single();

  // Padrão para quem nunca configurou = grátis. Se já tem chave paga, mantém.
  const textProvider =
    profile?.text_provider ?? (profile?.anthropic_key ? "claude" : "gemini");
  const imageProvider =
    profile?.image_provider ?? (profile?.luma_key ? "luma" : "pollinations");

  return (
    <main className="flex-1">
      <Studio
        email={user.email ?? ""}
        initial={{
          handle: profile?.handle ?? "@seu_perfil",
          niche: profile?.niche ?? "tecnologia e desenvolvimento de software",
          anthropicKey: profile?.anthropic_key ?? "",
          geminiKey: profile?.gemini_key ?? "",
          lumaKey: profile?.luma_key ?? "",
          model: profile?.model ?? "claude-opus-4-8",
          textProvider,
          imageProvider,
        }}
      />
      <footer className="text-center text-xs text-muted py-10 mono">
        post studio · suas chaves, seu conteúdo
      </footer>
    </main>
  );
}
