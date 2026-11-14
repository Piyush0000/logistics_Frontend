import { ArrowLeft, LifeBuoy } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { ARTICLES, categoryLabel } from '@/content/help/articles';
import { getDemoSession } from '@/lib/auth/session';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

const findArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = findArticle((await params).slug);
  return { title: `${article?.title ?? 'Help article'} | Evoc Ships` };
}

export default async function HelpArticlePage({ params }: ArticlePageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  // An unknown address is a real 404, not an empty page.
  const article = findArticle((await params).slug);
  if (!article) notFound();

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:gap-5">
      <Link
        href="/support/help"
        className="inline-flex h-11 w-fit items-center gap-2 text-sm font-medium text-primary lg:h-control"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to Help centre
      </Link>
      <PageHeader title={article.title} description={`${categoryLabel(article.category)}. ${article.summary}`} />

      <div className="grid gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
        <article className="motion-rise grid min-w-0 gap-6 rounded-card border border-secondary bg-surface p-card lg:gap-8">
          {article.body.map((section) => (
            <section key={section.heading} className="grid gap-2">
              <h2 className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">{section.heading}</h2>
              {section.paragraphs.map((text) => (
                <p key={text} className="text-sm leading-6 break-words text-on-surface/80 lg:text-base lg:leading-7">
                  {text}
                </p>
              ))}
            </section>
          ))}
        </article>

        <aside className="motion-rise grid min-w-0 gap-3 rounded-card border border-secondary bg-surface p-card xl:sticky xl:top-24">
          <span className="grid size-11 place-items-center rounded-control bg-muted text-primary">
            <LifeBuoy aria-hidden="true" className="size-5" />
          </span>
          <p className="font-heading text-lg leading-7 font-bold tracking-tight lg:text-xl">Still need help?</p>
          <div>
            <Link
              href="/support/tickets?new=1"
              className="inline-flex h-11 items-center rounded-control bg-primary px-4 text-sm font-semibold text-on-primary transition-colors duration-150 hover:bg-accent lg:h-control"
            >
              Raise a ticket
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
