import { NextResponse } from "next/server";
import { generateImageUrl } from "@/lib/luma";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const { lumaKey, prompt } = await req.json();
    if (!lumaKey) {
      return NextResponse.json(
        { error: "Cadastre sua chave da Luma nas configurações." },
        { status: 400 },
      );
    }
    if (!prompt) {
      return NextResponse.json({ error: "Prompt vazio" }, { status: 400 });
    }
    const url = await generateImageUrl(prompt, lumaKey);
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Falha ao gerar a arte na Luma" },
      { status: 500 },
    );
  }
}
