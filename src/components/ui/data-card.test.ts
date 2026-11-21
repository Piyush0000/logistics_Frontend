import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DataResult } from '@/lib/data/source';
import { DataCard } from './data-card';

vi.mock('@/app/(app)/dashboard/retry-button', () => ({ RetryButton: () => null }));

const render = (result: DataResult<string>) =>
  renderToStaticMarkup(
    // eslint-disable-next-line react/no-children-prop -- DataCard's children is a render function
    createElement(DataCard<string>, { testId: 'card', title: 'Card', result, children: (data: string) => data }),
  );

describe('DataCard', () => {
  it('shows nothing for a feature whose backend is not built yet', () => {
    const html = render({
      ok: false,
      source: 'gateway',
      error: { kind: 'unavailable', status: 503, message: 'Coming soon: this is not connected to live data yet.' },
    });
    expect(html).toBe('');
  });

  it('still shows a real failure with its message', () => {
    const html = render({ ok: false, source: 'gateway', error: { kind: 'network', status: 0, message: 'Gateway is down' } });
    expect(html).toContain('Gateway is down');
  });

  it('shows the content when the data loaded', () => {
    expect(render({ ok: true, source: 'gateway', data: 'hello' })).toContain('hello');
  });
});
