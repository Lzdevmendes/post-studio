export type NewsItem = {
  title: string;
  url: string;
  source: string;
  score: number;
  comments: number;
};

export type Post = {
  dia: string;
  headline: string;
  subtitle: string;
  caption: string;
  hashtags: string[];
  image_prompt: string;
  source_url: string;
};

export type Plan = {
  week_theme: string;
  days: Post[];
};

export const DIAS = [
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
] as const;
