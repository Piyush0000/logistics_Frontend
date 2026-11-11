import { Settings } from 'lucide-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { NavItem } from './nav-config';
import { ChildLink } from './sidebar';

const render = (item: NavItem) => renderToStaticMarkup(createElement(ChildLink, { item, pathname: '/dashboard' }));

describe('ChildLink', () => {
  it('renders a planned item as a disabled button with an unavailable title', () => {
    const html = render({ label: 'Future Screen', href: '/future', icon: Settings, status: 'planned' });
    expect(html).toContain('<button');
    expect(html).toContain('disabled');
    expect(html).toContain('title="Future Screen is not available yet"');
    expect(html).not.toContain('href=');
  });

  it('renders a live item as a link', () => {
    const html = render({ label: 'Live Screen', href: '/live', icon: Settings, status: 'live' });
    expect(html).toContain('href="/live"');
    expect(html).not.toContain('disabled');
  });
});
