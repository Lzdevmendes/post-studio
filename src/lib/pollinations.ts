// Imagem GRÁTIS e sem chave: Pollinations.ai. A própria URL é a imagem
// (gerada sob demanda). Usada direto como fundo no /api/og.
export function pollinationsUrl(prompt: string, seed = 0): string {
  const p = encodeURIComponent(prompt.slice(0, 380));
  return `https://image.pollinations.ai/prompt/${p}?width=1080&height=1350&nologo=true&model=flux&seed=${seed}`;
}
