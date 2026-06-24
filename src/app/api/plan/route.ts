import { NextResponse } from "next/server";
import { getNews } from "@/lib/news";
import { curate } from "@/lib/curate";
import { curateGemini } from "@/lib/curate-gemini";
import { curateFree, type FreeTextProvider } from "@/lib/curate-free";

export const runtime = "nodejs";
export const maxDuration = 60;

const FREE_PROVIDERS: FreeTextProvider[] = ["pollinations", "groq", "openrouter"];

export async function POST(req: Request) {
  try {
    const { provider, anthropicKey, geminiKey, freeKey, model, handle, niche } =
      await req.json();
    const brand = {
      handle: handle || "@perfil",
      niche: niche || "tecnologia e desenvolvimento de software",
    };

    const news = await getNews();
    if (news.length < 7) {
      return NextResponse.json(
        { error: "Poucas notícias encontradas agora. Tente de novo em instantes." },
        { status: 502 },
      );
    }

    let plan;
    if (provider === "gemini") {
      if (!geminiKey) {
        return NextResponse.json(
          { error: "Cadastre sua chave grátis do Gemini (aistudio.google.com)." },
          { status: 400 },
        );
      }
      plan = await curateGemini(news, geminiKey, brand);
    } else if (FREE_PROVIDERS.includes(provider)) {
      plan = await curateFree(provider, news, freeKey || "", brand, model);
    } else {
      if (!anthropicKey) {
        return NextResponse.json(
          { error: "Cadastre sua chave do Claude nas configurações." },
          { status: 400 },
        );
      }
      plan = await curate(news, anthropicKey, model || "claude-opus-4-8", brand);
    }

    return NextResponse.json(plan);
  } catch (err: any) {
    const raw = String(err?.message || "");
    let msg = raw || "Falha ao montar os posts";
    if (/credit balance is too low|Plans & Billing/i.test(raw)) {
      msg =
        "Sua conta da Anthropic está sem créditos de API. Use o motor grátis (Gemini) ou adicione créditos em console.claude.com → Billing.";
    } else if (/invalid x-api-key|authentication_error|401/i.test(raw)) {
      msg = "Chave do Claude inválida. Confira a chave (sk-ant-...) em console.claude.com → API Keys.";
    } else if (/rate_limit|429/i.test(raw)) {
      msg = "Muitas requisições agora. Espere alguns segundos e tente de novo.";
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
