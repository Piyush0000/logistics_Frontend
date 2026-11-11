import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ARTICLES, categoryLabel } from '@/content/help/articles';
import { getDemoSession } from '@/lib/auth/session';
import { walletService } from '@/lib/data/wallet';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

const findArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = findArticle((await params).slug);
  return { title: `${article?.title ?? 'Help article'} | Evoc Logistics` };
}

export default async function HelpArticlePage({ params }: ArticlePageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  // An unknown address is a real 404, not an empty page.
  const article = findArticle((await params).slug);
  if (!article) notFound();

  const wallet = await walletService().getBalance();

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid max-w-3xl gap-6">
        <Link href="/support/help" className="inline-flex h-11 items-center text-sm font-medium text-primary">
          Back to Help centre
        </Link>
        <PageHeader title={article.title} description={`${categoryLabel(article.category)}. ${article.summary}`} />

        <article className="grid gap-6 rounded-card border border-secondary bg-surface p-card">
          {article.body.map((section) => (
            <section key={section.heading} className="grid gap-2">
              <h2 className="font-heading text-xl leading-7 lg:text-2xl lg:leading-8">{section.heading}</h2>
              {section.paragraphs.map((text) => (
                <p key={text} className="text-sm leading-6 break-words text-on-surface/80 lg:text-base lg:leading-7">
                  {text}
                </p>
              ))}
            </section>
          ))}
        </article>

        <aside className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-secondary bg-muted p-card">
          <p className="font-medium">Still need help?</p>
          <Link
            href="/support/tickets?new=1"
            className="inline-flex h-11 items-center rounded-control bg-primary px-4 text-sm font-medium text-tertiary lg:h-control"
          >
            Raise a ticket
          </Link>
        </aside>
      </div>
    </AppShell>
  );
}
