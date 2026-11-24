import { describe, expect, it } from 'vitest';
import { ARTICLES, HELP_CATEGORIES } from './articles';

describe('help articles', () => {
  it('has at least 10 articles covering every category', () => {
    expect(ARTICLES.length).toBeGreaterThanOrEqual(10);
    for (const category of HELP_CATEGORIES) {
      expect(ARTICLES.some((a) => a.category === category.value), category.value).toBe(true);
    }
  });

  it('gives every article a unique, URL-safe slug', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it('gives every article a title, a summary and at least one body section', () => {
    for (const article of ARTICLES) {
      expect(article.title.trim(), article.slug).not.toBe('');
      expect(article.summary.trim(), article.slug).not.toBe('');
      expect(article.body.length, article.slug).toBeGreaterThan(0);
      for (const section of article.body) {
        expect(section.heading.trim(), article.slug).not.toBe('');
        expect(section.paragraphs.length, article.slug).toBeGreaterThan(0);
        for (const p of section.paragraphs) expect(p.trim(), article.slug).not.toBe('');
      }
    }
  });

  it('keeps the exact webhook header names', () => {
    const text = JSON.stringify(ARTICLES.find((a) => a.slug === 'verify-a-webhook-signature'));
    for (const name of ['X-Evoc-Event-Id', 'X-Evoc-Timestamp', 'X-Evoc-Signature']) {
      expect(text).toContain(name);
    }
  });
});
