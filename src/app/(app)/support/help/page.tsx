import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ARTICLES, HELP_CATEGORY_VALUES } from '@/content/help/articles';
import { getDemoSession } from '@/lib/auth/session';
import { walletService } from '@/lib/data/wallet';
import { parseEnum, parseText } from '@/lib/url-params';
import { HelpBrowser } from './help-browser';

export const metadata: Metadata = { title: 'Help centre | Evoc Logistics' };

interface HelpPageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const session = await getDemoSession();
  if (!session) redirect('/login');

  const params = await searchParams;
  // A topic that does not exist is ignored, so every article shows.
  const category = parseEnum(params.category, HELP_CATEGORY_VALUES);
  const wallet = await walletService().getBalance();

  return (
    <AppShell email={session.email} wallet={wallet}>
      <div className="grid gap-6">
        <PageHeader
          title="Help centre"
          description="Short guides to the screens in this app, written for merchants. Search, or pick a topic."
        />
        <HelpBrowser
          key={category ?? 'all'}
          articles={ARTICLES}
          category={category}
          initialQuery={parseText(params.q)}
        />
      </div>
    </AppShell>
  );
}
