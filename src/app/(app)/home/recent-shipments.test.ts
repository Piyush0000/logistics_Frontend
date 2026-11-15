import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecentShipments } from './recent-shipments';

describe('RecentShipments', () => {
  it('shows the empty message and a link to create the first shipment', () => {
    const html = renderToStaticMarkup(createElement(RecentShipments, { orders: [] }));

    expect(html).toContain('No shipments yet.');
    expect(html).toMatch(/<a [^>]*href="\/orders\/create"[^>]*>Create your first shipment<\/a>/);
    expect(html).not.toContain('data-testid="recent-shipment"');
  });
});
