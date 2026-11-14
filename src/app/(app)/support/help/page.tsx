import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ARTICLES, HELP_CATEGORIES, HELP_CATEGORY_VALUES, categoryLabel } from '@/content/help/articles';
import { HELP_QUERY_MAX, searchArticles } from '@/lib/help-search';
import { getDemoSession } from '@/lib/auth/session';
import { parseEnum, parseText } from '@/lib/url-params';
import { HelpBrowser, type HelpArticleSummary } from './help-browser';

export const metadata: Metadata = { title: 'Help centre | Evoc Ships' };

interface HelpPageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  // A topic that does not exist is ignored, so every article shows.
  const category = parseEnum(params.category, HELP_CATEGORY_VALUES);
  const query = parseText(params.q, HELP_QUERY_MAX);

  // Filter here, so the browser gets only what the list shows and never the article bodies.
  const inTopic = category ? ARTICLES.filter((a) => a.category === category) : ARTICLES;
  const results: HelpArticleSummary[] = searchArticles(query, inTopic).map(
    ({ slug, title, summary, category: topic }) => ({
      slug,
      title,
      summary,
      category: topic,
      categoryLabel: categoryLabel(topic),
    }),
  );

  return (
    <div className="grid gap-4 lg:gap-5">
      <PageHeader
        title="Help centre"
        description="Short guides to the screens in this app, written for merchants. Search, or pick a topic."
      />
      <HelpBrowser
        key={category ?? 'all'}
        results={results}
        topics={HELP_CATEGORIES}
        category={category}
        initialQuery={query}
      />
    </div>
  );
}
