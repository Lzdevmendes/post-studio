// Imagem GRÁTIS com chave grátis: Hugging Face Inference API (FLUX.1-schnell).
// Token grátis em huggingface.co/settings/tokens. Retorna os bytes da imagem,
// que devolvemos como data URI para o /api/og compor o fundo.
const MODEL = "black-forest-labs/FLUX.1-schnell";

export async function huggingfaceDataUri(
  prompt: string,
  token: string,
): Promise<string> {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { width: 1024, height: 1280 },
      }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401) {
      throw new Error("Token do Hugging Face inválido (huggingface.co/settings/tokens).");
    }
    if (res.status === 503) {
      throw new Error("Modelo do Hugging Face carregando. Espere ~20s e tente de novo.");
    }
    throw new Error(`Hugging Face ${res.status}: ${body.slice(0, 160)}`);
  }

  const type = res.headers.get("content-type") || "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${type};base64,${buf.toString("base64")}`;
}
