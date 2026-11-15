import { describe, expect, it } from 'vitest';
import { searchArticles } from './help-search';
import type { HelpArticle } from '@/content/help/articles';

const make = (slug: string, title: string, summary: string, text: string): HelpArticle => ({
  slug,
  title,
  category: 'shipping',
  summary,
  body: [{ heading: 'Details', paragraphs: [text] }],
});

const BODY_HIT = make('body-hit', 'Packing tips', 'How to pack.', 'Remember the label for each parcel.');
const TITLE_HIT = make('title-hit', 'Print a label', 'Get your label.', 'Open the shipment.');
const SUMMARY_HIT = make('summary-hit', 'Pickups', 'Where your label goes.', 'Schedule a pickup.');
const NO_HIT = make('no-hit', 'Wallet', 'Add money.', 'Use recharge.');
const ALL = [BODY_HIT, SUMMARY_HIT, NO_HIT, TITLE_HIT];

describe('searchArticles', () => {
  it('ranks title matches before body matches', () => {
    const slugs = searchArticles('label', ALL).map((a) => a.slug);
    expect(slugs).toEqual(['title-hit', 'summary-hit', 'body-hit']);
  });

  it('ignores case and surrounding spaces', () => {
    expect(searchArticles('  PRINT A LABEL ', ALL).map((a) => a.slug)).toEqual(['title-hit']);
  });

  it('returns every article for an empty or blank query', () => {
    expect(searchArticles('', ALL)).toEqual(ALL);
    expect(searchArticles('   ', ALL)).toEqual(ALL);
  });

  it('returns nothing when no article matches', () => {
    expect(searchArticles('zzzz', ALL)).toEqual([]);
  });

  it('requires every word to appear somewhere in the article', () => {
    expect(searchArticles('wallet recharge', ALL).map((a) => a.slug)).toEqual(['no-hit']);
    expect(searchArticles('wallet label', ALL)).toEqual([]);
  });
});
