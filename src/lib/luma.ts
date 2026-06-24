const BASE = "https://api.lumalabs.ai/dream-machine/v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function headers(key: string) {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// Gera uma imagem no Photon e devolve a URL pública do CDN da Luma.
// (No web não precisamos baixar — o next/og compõe direto sobre essa URL.)
export async function generateImageUrl(
  prompt: string,
  apiKey: string,
): Promise<string> {
  const create = await fetch(`${BASE}/generations/image`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      prompt,
      model: "photon-1",
      aspect_ratio: "3:4",
    }),
  });
  if (!create.ok) {
    throw new Error(`Luma create ${create.status}: ${await create.text()}`);
  }
  const job = await create.json();

  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const res = await fetch(`${BASE}/generations/${job.id}`, {
      headers: headers(apiKey),
    });
    if (!res.ok) throw new Error(`Luma poll ${res.status}`);
    const state = await res.json();
    if (state.state === "completed") {
      const imageUrl = state.assets?.image;
      if (!imageUrl) throw new Error("Luma completou sem URL");
      return imageUrl as string;
    }
    if (state.state === "failed") {
      throw new Error(`Luma falhou: ${state.failure_reason || "desconhecido"}`);
    }
  }
  throw new Error("Luma: timeout (2min)");
}

// Valida a chave da Luma com uma chamada leve.
export async function validateLumaKey(apiKey: string): Promise<boolean> {
  const res = await fetch(`${BASE}/credits`, { headers: headers(apiKey) });
  return res.ok;
}
