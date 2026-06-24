// Imagem GRÁTIS com chave grátis: Cloudflare Workers AI (FLUX.1-schnell).
// Precisa do Account ID e de um API Token (free tier diário de "neurons").
// dash.cloudflare.com → Workers AI. Retorna base64 JPEG no campo result.image.
const MODEL = "@cf/black-forest-labs/flux-1-schnell";

export async function cloudflareDataUri(
  prompt: string,
  accountId: string,
  token: string,
): Promise<string> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, steps: 6 }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error("Token ou Account ID do Cloudflare inválido (Workers AI).");
    }
    throw new Error(`Cloudflare ${res.status}: ${body.slice(0, 160)}`);
  }

  const data = await res.json();
  const b64 = data?.result?.image;
  if (!b64) throw new Error("Cloudflare não retornou imagem.");
  return `data:image/jpeg;base64,${b64}`;
}
