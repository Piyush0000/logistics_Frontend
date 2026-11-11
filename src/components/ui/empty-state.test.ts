import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

function findLinks(node: ReactNode, found: ReactElement<Record<string, unknown>>[] = []) {
  if (Array.isArray(node)) node.forEach((child) => findLinks(child, found));
  else if (isValidElement<Record<string, unknown>>(node)) {
    if (typeof node.props.href === 'string') found.push(node);
    findLinks(node.props.children as ReactNode, found);
  }
  return found;
}

describe('EmptyState action link', () => {
  it('forwards prefetch={false}', () => {
    const links = findLinks(EmptyState({ message: 'x', action: { label: 'Go', href: '/a', prefetch: false } }));
    expect(links).toHaveLength(1);
    expect(links[0]?.props.prefetch).toBe(false);
  });

  it('leaves prefetch at the default when not given', () => {
    const links = findLinks(EmptyState({ message: 'x', action: { label: 'Go', href: '/a' } }));
    expect(links[0]?.props.prefetch).toBeUndefined();
  });
});
