import { NextResponse } from "next/server";
import { huggingfaceDataUri } from "@/lib/huggingface";
import { cloudflareDataUri } from "@/lib/cloudflare";

export const runtime = "nodejs";
export const maxDuration = 120;

// Motores de imagem que devolvem bytes (não uma URL hospedada): geramos aqui
// e retornamos um data URI, que o /api/og usa direto como fundo.
export async function POST(req: Request) {
  try {
    const { provider, prompt, hfKey, cfAccountId, cfToken } = await req.json();
    const p = (prompt || "abstract dark technology background").slice(0, 480);

    let dataUri: string;
    if (provider === "huggingface") {
      if (!hfKey) {
        return NextResponse.json(
          { error: "Cadastre seu token grátis do Hugging Face." },
          { status: 400 },
        );
      }
      dataUri = await huggingfaceDataUri(p, hfKey);
    } else if (provider === "cloudflare") {
      if (!cfAccountId || !cfToken) {
        return NextResponse.json(
          { error: "Cadastre o Account ID e o token do Cloudflare." },
          { status: 400 },
        );
      }
      dataUri = await cloudflareDataUri(p, cfAccountId, cfToken);
    } else {
      return NextResponse.json({ error: "Motor de imagem inválido." }, { status: 400 });
    }

    return NextResponse.json({ dataUri });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Falha ao gerar a imagem" },
      { status: 500 },
    );
  }
}
