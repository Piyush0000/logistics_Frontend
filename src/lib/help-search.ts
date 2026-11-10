import type { HelpArticle } from '@/content/help/articles';

const words = (text: string) => text.toLowerCase().split(/\s+/).filter(Boolean);

function bodyText(article: HelpArticle): string {
  return article.body
    .flatMap((section) => [section.heading, ...section.paragraphs])
    .join(' ')
    .toLowerCase();
}

/**
 * Articles that contain every word of `query` in the title, summary or body, ignoring case.
 * A title match ranks first, then a summary match, then body only. Ties keep their order.
 * An empty query returns every article.
 */
export function searchArticles(query: string, articles: HelpArticle[]): HelpArticle[] {
  const terms = words(query);
  if (terms.length === 0) return articles;

  const ranked: { article: HelpArticle; rank: number; index: number }[] = [];
  articles.forEach((article, index) => {
    const title = article.title.toLowerCase();
    const summary = article.summary.toLowerCase();
    const body = bodyText(article);
    if (!terms.every((t) => title.includes(t) || summary.includes(t) || body.includes(t))) return;
    const rank = terms.every((t) => title.includes(t))
      ? 0
      : terms.every((t) => title.includes(t) || summary.includes(t))
        ? 1
        : 2;
    ranked.push({ article, rank, index });
  });
  return ranked.sort((a, b) => a.rank - b.rank || a.index - b.index).map((r) => r.article);
}
