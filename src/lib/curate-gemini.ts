import type { NewsItem, Plan } from "./types";

// Motor de texto GRÁTIS: Google Gemini (tier gratuito, chave grátis no aistudio.google.com).
// Não usa o SDK da Anthropic — chamada HTTP direta à API do Gemini.

const GEMINI_MODEL = "gemini-2.5-flash";

const SHAPE = `Responda APENAS com um JSON válido neste formato exato:
{
  "week_theme": "string",
  "days": [
    {
      "dia": "segunda|terça|quarta|quinta|sexta|sábado|domingo",
      "headline": "gancho curto, máx ~55 caracteres",
      "subtitle": "1 linha, máx ~85 caracteres",
      "caption": "legenda pt-BR com 3-6 linhas curtas (use \\n), termina com 1 pergunta. SEM hashtags",
      "hashtags": ["5 a 8 tags sem o #"],
      "image_prompt": "descrição visual EM INGLÊS de um fundo abstrato/tech, SEM texto/logos/UI",
      "source_url": "url da notícia"
    }
  ]
}
São exatamente 7 itens em "days", um para cada dia de segunda a domingo.`;

export async function curateGemini(
  news: NewsItem[],
  apiKey: string,
  brand: { handle: string; niche: string },
): Promise<Plan> {
  const newsList = news
    .map((n, i) => `${i + 1}. "${n.title}" [${n.source}, ${n.score} pts] ${n.url}`)
    .join("\n");

  const system = `Você é o estrategista de conteúdo do perfil de Instagram "${brand.handle}" (nicho: ${brand.niche}).
A partir das notícias da semana, monte 7 posts (um por dia, seg-dom) úteis, com opinião e voz autêntica de dev. Varie os temas.
${SHAPE}`;

  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [
      {
        role: "user",
        parts: [{ text: `Notícias da semana:\n\n${newsList}\n\nMonte os 7 posts.` }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
      temperature: 0.9,
    },
  });

  let data: any;
  // O Gemini grátis devolve 503 UNAVAILABLE (e às vezes 429) quando está
  // sobrecarregado — costuma passar em segundos, então tenta de novo.
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: payload },
    );
    if (res.ok) {
      data = await res.json();
      break;
    }
    const body = await res.text();
    if (/API_KEY_INVALID|API key not valid/i.test(body)) {
      throw new Error("Chave do Gemini inválida. Pegue uma grátis em aistudio.google.com → Get API key.");
    }
    const transient = res.status === 429 || res.status >= 500;
    if (transient && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (res.status === 429) {
      throw new Error("Limite do tier grátis do Gemini atingido agora. Espere um pouco e tente de novo.");
    }
    if (res.status === 503) {
      throw new Error("Gemini sobrecarregado agora (503). Tente de novo em instantes ou troque de motor.");
    }
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini não retornou conteúdo");
  const plan = JSON.parse(text) as Plan;
  if (!Array.isArray(plan.days) || plan.days.length < 7) {
    throw new Error(`Esperava 7 posts, veio ${plan.days?.length}`);
  }
  return plan;
}
