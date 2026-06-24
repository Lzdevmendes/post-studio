import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Studio, { type Template } from "@/components/Studio";
import type { ArtStyle } from "@/lib/pollinations";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "handle, niche, anthropic_key, luma_key, gemini_key, model, text_provider, image_provider, groq_key, openrouter_key, hf_key, cf_account_id, cf_token, art_style, template",
    )
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
          groqKey: profile?.groq_key ?? "",
          openrouterKey: profile?.openrouter_key ?? "",
          hfKey: profile?.hf_key ?? "",
          cfAccountId: profile?.cf_account_id ?? "",
          cfToken: profile?.cf_token ?? "",
          artStyle: (profile?.art_style ?? "abstrato") as ArtStyle,
          template: (profile?.template ?? "padrao") as Template,
        }}
      />
      <footer className="text-center text-xs text-muted py-10 mono">
        post studio · suas chaves, seu conteúdo
      </footer>
    </main>
  );
}
