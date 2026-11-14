'use client';

import { BookOpen, ChevronRight, CreditCard, Plug, Rocket, Search, Truck, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { HELP_CATEGORIES, categoryLabel, type HelpArticle, type HelpCategory } from '@/content/help/articles';
import { HELP_QUERY_MAX as QUERY_MAX } from '@/lib/help-search';

export const TICKET_HREF = '/support/tickets?new=1';
const PATH = '/support/help';
/** How long typing pauses before the server filters again. */
const SEARCH_DELAY_MS = 200;

/** What the list needs of an article. The body stays on the server until the article opens. */
export type HelpArticleSummary = Pick<HelpArticle, 'slug' | 'title' | 'summary' | 'category'>;

const CHIP =
  'inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-150 lg:h-control';
const CHIP_ON = 'border-primary bg-primary text-on-primary';
const CHIP_OFF = 'border-secondary bg-surface hover:border-primary/40 hover:bg-muted';

const CATEGORY_ICONS: Record<HelpCategory, LucideIcon> = {
  getting_started: Rocket,
  shipping: Truck,
  billing: CreditCard,
  integrations: Plug,
  account: UserRound,
};

function topicHref(category: HelpCategory | undefined, query: string): string {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const q = query.trim();
  if (q) params.set('q', q);
  const text = params.toString();
  return text ? `${PATH}?${text}` : PATH;
}

/**
 * The search box, the topic links and the article list. The server filters by `?q=` and the topic,
 * so typing updates `?q=` (after a short pause) and the list follows.
 */
export function HelpBrowser({
  results,
  category,
  initialQuery,
}: {
  results: HelpArticleSummary[];
  category: HelpCategory | undefined;
  initialQuery: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [pending, startTransition] = useTransition();
  const sent = useRef(initialQuery.trim());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelSearch = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => cancelSearch, []);

  function handleChange(value: string) {
    setQuery(value);
    cancelSearch();
    timer.current = setTimeout(() => {
      timer.current = null;
      const next = value.trim();
      if (next === sent.current) return;
      sent.current = next;
      startTransition(() => router.replace(topicHref(category, next), { scroll: false }));
    }, SEARCH_DELAY_MS);
  }

  return (
    <div className="grid gap-4 lg:gap-5">
      <section
        aria-label="Search the help centre"
        className="motion-rise min-w-0 rounded-card border border-secondary bg-surface p-card"
      >
        <label htmlFor="help-search" className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">
          Search help articles
        </label>
        <div className="relative mt-3">
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
            onChange={(event) => handleChange(event.target.value)}
            className="h-11 w-full rounded-control border border-secondary bg-surface pr-3 pl-10 text-base transition-[border-color,box-shadow] duration-150 hover:border-on-surface/30 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none lg:h-control lg:text-sm"
          />
        </div>
        <nav aria-label="Topics" className="mt-4 flex flex-wrap gap-2">
          <Link
            href={topicHref(undefined, query)}
            onClick={cancelSearch}
            aria-current={category ? undefined : 'page'}
            className={`${CHIP} ${category ? CHIP_OFF : CHIP_ON}`}
          >
            All topics
          </Link>
          {HELP_CATEGORIES.map((item) => (
            <Link
              key={item.value}
              href={topicHref(item.value, query)}
              onClick={cancelSearch}
              aria-current={category === item.value ? 'page' : undefined}
              className={`${CHIP} ${category === item.value ? CHIP_ON : CHIP_OFF}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </section>

      <p role="status" className="flex items-center gap-2 text-sm text-on-surface/70">
        <BookOpen aria-hidden="true" className="size-4 text-primary" />
        {results.length === 1 ? '1 article' : `${results.length} articles`}
      </p>

      <div className={`transition-opacity duration-150 ${pending ? 'opacity-60' : ''}`}>
        {results.length === 0 ? (
          <EmptyState
            message="No articles match your search. Try a shorter word, or raise a ticket and we will help."
            action={{ label: 'Raise a ticket', href: TICKET_HREF }}
          />
        ) : (
          <ul className="motion-stagger grid gap-3 lg:gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {results.map((article) => {
              const Icon = CATEGORY_ICONS[article.category];
              return (
                <li
                  key={article.slug}
                  data-testid="help-article"
                  className="lift min-w-0 rounded-card border border-secondary bg-surface"
                >
                  <Link
                    href={`${PATH}/${article.slug}`}
                    className="flex h-full min-h-11 items-start gap-3 p-card"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-control bg-muted text-primary">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-primary">{categoryLabel(article.category)}</span>
                      <span className="block font-heading text-lg leading-6 font-bold tracking-tight break-words">
                        {article.title}
                      </span>
                      <span className="mt-1 block text-sm text-on-surface/70">{article.summary}</span>
                    </span>
                    <ChevronRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-on-surface/50" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
