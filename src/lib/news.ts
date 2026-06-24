import type { NewsItem } from "./types";

const WEEK_SECONDS = 7 * 24 * 60 * 60;

async function fetchHackerNews(): Promise<NewsItem[]> {
  const since = Math.floor(Date.now() / 1000) - WEEK_SECONDS;
  const url =
    "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HN ${res.status}`);
  const json = await res.json();
  return (json.hits || [])
    .filter((h: any) => h.title && h.url && (h.points || 0) >= 50)
    .filter((h: any) => (h.created_at_i || since) >= since)
    .map((h: any) => ({
      title: h.title,
      url: h.url,
      source: "Hacker News",
      score: h.points || 0,
      comments: h.num_comments || 0,
    }));
}

async function fetchDevTo(): Promise<NewsItem[]> {
  const res = await fetch("https://dev.to/api/articles?top=7&per_page=25", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`dev.to ${res.status}`);
  const json = await res.json();
  return (json || [])
    .filter((a: any) => a.title && a.url)
    .map((a: any) => ({
      title: a.title,
      url: a.url,
      source: "dev.to",
      score: a.positive_reactions_count || 0,
      comments: a.comments_count || 0,
    }));
}

export async function getNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled([fetchHackerNews(), fetchDevTo()]);
  const items = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);

  const seen = new Set<string>();
  const unique: NewsItem[] = [];
  for (const it of items) {
    const key = it.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(it);
  }

  unique.sort((a, b) => b.score - a.score);
  return unique.slice(0, 30);
}
