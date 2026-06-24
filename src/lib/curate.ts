import Anthropic from "@anthropic-ai/sdk";
import { DIAS, type NewsItem, type Plan } from "./types";

const POST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    week_theme: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          dia: { type: "string", enum: [...DIAS] },
          headline: { type: "string" },
          subtitle: { type: "string" },
          caption: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
          image_prompt: { type: "string" },
          source_url: { type: "string" },
        },
        required: [
          "dia",
          "headline",
          "subtitle",
          "caption",
          "hashtags",
          "image_prompt",
          "source_url",
        ],
      },
    },
  },
  required: ["week_theme", "days"],
};

function systemPrompt(brand: { handle: string; niche: string }) {
  return `Você é o estrategista de conteúdo do perfil de Instagram "${brand.handle}".
Nicho/tema do perfil: ${brand.niche}.
A partir das notícias da semana, monte 7 posts (um por dia, segunda a domingo) úteis, com opinião e voz autêntica — nada de hype vazio.

Regras de cada post:
- headline: gancho curto e forte, MÁXIMO ~55 caracteres (texto grande do post).
- subtitle: complemento de 1 linha, MÁXIMO ~85 caracteres.
- caption: legenda do Instagram em pt-BR (3 a 6 linhas curtas com quebras \\n), terminando com 1 pergunta de engajamento. SEM hashtags na caption.
- hashtags: 5 a 8 hashtags relevantes (sem o #).
- image_prompt: descrição visual EM INGLÊS para um fundo abstrato (gradientes, formas, atmosfera coerente entre os 7 dias). NUNCA peça texto, palavras, logos ou UI — o texto é adicionado por código depois.
- source_url: a URL da notícia que inspirou o post.

Varie os temas ao longo da semana.`;
}

export async function curate(
  news: NewsItem[],
  apiKey: string,
  model: string,
  brand: { handle: string; niche: string },
): Promise<Plan> {
  const client = new Anthropic({ apiKey });
  const newsList = news
    .map((n, i) => `${i + 1}. "${n.title}" [${n.source}, ${n.score} pts] ${n.url}`)
    .join("\n");

  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    system: systemPrompt(brand),
    output_config: { format: { type: "json_schema", schema: POST_SCHEMA } },
    messages: [
      {
        role: "user",
        content: `Notícias da semana:\n\n${newsList}\n\nMonte os 7 posts.`,
      },
    ],
  } as any);

  const text = response.content.find((b: any) => b.type === "text") as
    | { text: string }
    | undefined;
  if (!text) throw new Error("Claude não retornou conteúdo");
  const data = JSON.parse(text.text) as Plan;
  if (!Array.isArray(data.days) || data.days.length < 7) {
    throw new Error(`Esperava 7 posts, veio ${data.days?.length}`);
  }
  return data;
}
