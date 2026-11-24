'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** The section list: a sticky column on wide screens, a scrollable row of chips on phones. */
export function DocsNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Developer docs" className="min-w-0 lg:sticky lg:top-20 lg:self-start">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:gap-1 lg:overflow-visible lg:px-0">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-11 items-center rounded-control px-3 text-sm whitespace-nowrap lg:h-9 ${
                  active ? 'bg-primary/10 font-semibold text-primary' : 'hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
