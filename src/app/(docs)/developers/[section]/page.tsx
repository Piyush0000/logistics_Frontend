import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SECTIONS, sectionBySlug } from '@/content/developers/reference';
import { EndpointBlock, MethodBadge } from '../blocks';

export function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const section = sectionBySlug((await params).section);
  return { title: section?.title ?? 'Not found' };
}

/** One part of the API reference: an intro, a list of its endpoints, then each in full. */
export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const section = sectionBySlug((await params).section);
  if (!section) notFound();

  return (
    <article className="grid grid-cols-[minmax(0,1fr)] gap-6">
      <header className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <h1 className="font-heading text-[28px] leading-9 font-extrabold tracking-tight lg:text-4xl">{section.title}</h1>
        {section.intro.map((p) => (
          <p key={p} className="max-w-3xl text-on-surface/80">
            {p}
          </p>
        ))}
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-1 rounded-card border border-secondary bg-surface p-3 text-sm">
          {section.endpoints.map((e) => (
            <li key={e.id}>
              <a href={`#${e.id}`} className="flex flex-wrap items-center gap-2 rounded px-1 py-1 hover:bg-muted">
                <MethodBadge method={e.method} />
                <code className="font-mono [overflow-wrap:anywhere]">{e.path}</code>
                <span className="text-on-surface/70">{e.title}</span>
              </a>
            </li>
          ))}
        </ul>
      </header>
      {section.endpoints.map((endpoint) => (
        <EndpointBlock key={endpoint.id} endpoint={endpoint} />
      ))}
    </article>
  );
}
