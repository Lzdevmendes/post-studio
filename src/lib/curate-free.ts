import type { NewsItem, Plan } from "./types";

// Motores de texto GRÁTIS que falam o protocolo OpenAI (chat/completions):
//  - pollinations: text.pollinations.ai — SEM chave, 100% grátis
//  - groq:        api.groq.com — chave grátis (console.groq.com), bem rápido
//  - openrouter:  openrouter.ai — chave grátis, vários modelos :free
export type FreeTextProvider = "pollinations" | "groq" | "openrouter";

const ENDPOINTS: Record<
  FreeTextProvider,
  { url: string; defaultModel: string; needsKey: boolean; label: string }
> = {
  pollinations: {
    url: "https://text.pollinations.ai/openai",
    defaultModel: "openai",
    needsKey: false,
    label: "Pollinations",
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    needsKey: true,
    label: "Groq",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    needsKey: true,
    label: "OpenRouter",
  },
};

const SHAPE = `Responda APENAS com um JSON válido neste formato exato, sem markdown:
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

// Modelos costumam embrulhar o JSON em ```json ... ``` ou texto extra.
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

export function freeTextNeedsKey(provider: FreeTextProvider): boolean {
  return ENDPOINTS[provider].needsKey;
}

export async function curateFree(
  provider: FreeTextProvider,
  news: NewsItem[],
  apiKey: string,
  brand: { handle: string; niche: string },
  model?: string,
): Promise<Plan> {
  const cfg = ENDPOINTS[provider];
  if (cfg.needsKey && !apiKey) {
    throw new Error(`Cadastre sua chave grátis do ${cfg.label}.`);
  }

  const newsList = news
    .map((n, i) => `${i + 1}. "${n.title}" [${n.source}, ${n.score} pts] ${n.url}`)
    .join("\n");

  const system = `Você é o estrategista de conteúdo do perfil de Instagram "${brand.handle}" (nicho: ${brand.niche}).
A partir das notícias da semana, monte 7 posts (um por dia, seg-dom) úteis, com opinião e voz autêntica de dev. Varie os temas.
${SHAPE}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://post-studio.app";
    headers["X-Title"] = "Post Studio";
  }

  const res = await fetch(cfg.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: model || cfg.defaultModel,
      temperature: 0.9,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Notícias da semana:\n\n${newsList}\n\nMonte os 7 posts.` },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 401 || /invalid api key|unauthorized/i.test(body)) {
      throw new Error(`Chave do ${cfg.label} inválida. Confira nas configurações.`);
    }
    if (res.status === 429) {
      throw new Error(`Limite do tier grátis do ${cfg.label} agora. Espere um pouco e tente de novo.`);
    }
    throw new Error(`${cfg.label} ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${cfg.label} não retornou conteúdo`);
  const plan = JSON.parse(extractJson(text)) as Plan;
  if (!Array.isArray(plan.days) || plan.days.length < 7) {
    throw new Error(`Esperava 7 posts, veio ${plan.days?.length}`);
  }
  return plan;
}
