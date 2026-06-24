// Imagem GRÁTIS e sem chave: Pollinations.ai. A própria URL é a imagem
// (gerada sob demanda). O /api/og baixa essa URL no servidor e embute no fundo.

export type ArtStyle =
  | "abstrato"
  | "render3d"
  | "neon"
  | "minimal"
  | "vaporwave"
  | "blueprint"
  | "rapido";

// Cada estilo é grátis e sem chave: muda só o `model` do Pollinations e o
// sufixo de prompt. Todos pedem fundo escuro e SEM texto (o texto é montado
// por código no /api/og).
export const ART_STYLES: {
  id: ArtStyle;
  label: string;
  model: string;
  suffix: string;
}[] = [
  {
    id: "abstrato",
    label: "Abstrato tech",
    model: "flux",
    suffix:
      "abstract dark technology background, depth of field, cinematic, no text, no logos, no UI",
  },
  {
    id: "render3d",
    label: "3D render",
    model: "flux",
    suffix:
      "modern 3d render, soft studio lighting, glossy geometric shapes, dark background, no text, no logos",
  },
  {
    id: "neon",
    label: "Neon cyber",
    model: "flux",
    suffix:
      "cyberpunk neon glow, dark moody atmosphere, bokeh city lights, no text, no logos",
  },
  {
    id: "minimal",
    label: "Minimalista",
    model: "flux",
    suffix:
      "minimalist geometric background, soft gradient, generous negative space, dark, no text, no logos",
  },
  {
    id: "vaporwave",
    label: "Vaporwave",
    model: "flux",
    suffix:
      "vaporwave retro gradient, grid horizon, pastel synthwave, dark, no text, no logos",
  },
  {
    id: "blueprint",
    label: "Blueprint",
    model: "flux",
    suffix:
      "technical blueprint schematic on dark navy, fine glowing lines, no text, no logos",
  },
  {
    id: "rapido",
    label: "Rápido (turbo)",
    model: "turbo",
    suffix:
      "abstract dark technology background, clean, no text, no logos, no UI",
  },
];

// Fallback de prompt para quando a IA de texto não devolve um image_prompt
// (acontecia no último dia da semana e deixava a arte vazia).
const DEFAULT_PROMPT = "abstract dark technology background, soft gradient";

export function pollinationsUrl(
  prompt: string,
  seed = 0,
  style: ArtStyle = "abstrato",
): string {
  const preset = ART_STYLES.find((s) => s.id === style) ?? ART_STYLES[0];
  const base = (prompt || "").trim() || DEFAULT_PROMPT;
  const full = `${base}, ${preset.suffix}`;
  const p = encodeURIComponent(full.slice(0, 380));
  return `https://image.pollinations.ai/prompt/${p}?width=1080&height=1350&nologo=true&model=${preset.model}&seed=${seed}`;
}
