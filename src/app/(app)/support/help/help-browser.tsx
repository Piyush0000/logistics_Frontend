'use client';

import { ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import {
  HELP_CATEGORIES,
  categoryLabel,
  type HelpArticle,
  type HelpCategory,
} from '@/content/help/articles';
import { HELP_QUERY_MAX as QUERY_MAX, searchArticles } from '@/lib/help-search';

export const TICKET_HREF = '/support/tickets?new=1';
const PATH = '/support/help';

const CHIP = 'inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium lg:h-control';
const CHIP_ON = 'border-primary bg-primary text-tertiary';

function topicHref(category: HelpCategory | undefined, query: string): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const q = query.trim();
  if (q) params.set('q', q);
  const text = params.toString();
  return text ? `${PATH}?${text}` : PATH;
}

/** The search box, the topic links and the article list. Typing filters the list at once. */
export function HelpBrowser({
  articles,
  category,
  initialQuery,
}: {
  articles: HelpArticle[];
  category: HelpCategory | undefined;
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const inTopic = category ? articles.filter((a) => a.category === category) : articles;
  const results = searchArticles(query, inTopic);

  return (
    <div className="grid gap-6">
      <section aria-label="Search the help centre" className="rounded-card border border-secondary bg-surface p-card">
        <label htmlFor="help-search" className="text-sm font-medium">
          Search help articles
        </label>
        <div className="relative mt-2">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-on-surface/60"
          />
          <input
            id="help-search"
            type="search"
            name="q"
            value={query}
            maxLength={QUERY_MAX}
            autoComplete="off"
            placeholder="Try wallet or pickup"
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-control border border-secondary bg-surface pr-3 pl-10 text-base lg:h-control lg:text-sm"
          />
        </div>
        <nav aria-label="Topics" className="mt-4 flex flex-wrap gap-2">
          <Link
            href={topicHref(undefined, query)}
            aria-current={category ? undefined : 'page'}
            className={`${CHIP} ${category ? 'border-secondary' : CHIP_ON}`}
          >
            All topics
          </Link>
          {HELP_CATEGORIES.map((item) => (
            <Link
              key={item.value}
              href={topicHref(item.value, query)}
              aria-current={category === item.value ? 'page' : undefined}
              className={`${CHIP} ${category === item.value ? CHIP_ON : 'border-secondary'}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      <p role="status" className="text-sm text-on-surface/70">
        {results.length === 1 ? '1 article' : `${results.length} articles`}
      </p>

      {results.length === 0 ? (
        <EmptyState
          message="No articles match your search. Try a shorter word, or raise a ticket and we will help."
          // The tickets screen is not built yet, so Next must not try to prefetch it.
          action={{ label: 'Raise a ticket', href: TICKET_HREF, prefetch: false }}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {results.map((article) => (
            <li
              key={article.slug}
              data-testid="help-article"
              className="min-w-0 rounded-card border border-secondary bg-surface"
            >
              <Link href={`${PATH}/${article.slug}`} className="flex min-h-11 items-start justify-between gap-3 p-card">
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-primary">{categoryLabel(article.category)}</span>
                  <span className="block font-heading text-lg leading-6 font-semibold break-words">
                    {article.title}
                  </span>
                  <span className="mt-1 block text-sm text-on-surface/70">{article.summary}</span>
                </span>
                <ChevronRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-on-surface/50" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
