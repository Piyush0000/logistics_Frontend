import { describe, expect, it } from 'vitest';
import { API_BASE, codeSamples, examplePath, SECTIONS, sectionBySlug, STATUSES } from './reference';

const endpoints = SECTIONS.flatMap((s) => s.endpoints);

describe('API reference', () => {
  it('gives every endpoint a unique anchor and a path under the API', () => {
    const ids = endpoints.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of endpoints) expect(e.path.startsWith('/')).toBe(true);
    expect(new Set(SECTIONS.map((s) => s.slug)).size).toBe(SECTIONS.length);
    expect(sectionBySlug('webhooks')).toBeNull(); // webhooks has its own page
  });

  it('fills every path placeholder in the examples', () => {
    for (const e of endpoints) {
      const path = examplePath(e);
      expect(path, e.id).not.toMatch(/\{|\}/);
      if (/\{/.test(e.path)) expect(e.pathParams?.length, e.id).toBeGreaterThan(0);
    }
  });

  it('documents a body for every POST that takes one, with a JSON example', () => {
    for (const e of endpoints.filter((e) => e.body)) {
      expect(e.example, e.id).toBeDefined();
      for (const field of e.body!.filter((f) => f.required && !f.name.includes('.') && !f.name.includes('[]'))) {
        expect(Object.keys(e.example as object), `${e.id} example is missing ${field.name}`).toContain(field.name);
      }
    }
  });

  it('writes runnable samples: the right method and URL, the key from the environment, never a real key', () => {
    for (const e of endpoints) {
      const [curl, js, py] = codeSamples(e);
      const url = `${API_BASE}${examplePath(e)}`;
      expect(curl!.code).toContain(`-X ${e.method} '${url}'`);
      // In single quotes the shell would send the text "$EVOC_API_KEY" instead of the key.
      expect(curl!.code).toContain(`-H "Authorization: Bearer $EVOC_API_KEY"`);
      expect(js!.code).toContain(`method: '${e.method}'`);
      expect(py!.code).toContain(`requests.${e.method.toLowerCase()}(`);
      for (const s of [curl, js, py]) {
        expect(s!.code).toContain('EVOC_API_KEY');
        expect(s!.code).not.toMatch(/evs_live_[A-Za-z0-9]/);
      }
      // Python literals, not JSON ones.
      expect(py!.code).not.toMatch(/: (null|true|false)\b/);
    }
  });

  it('lists every shipment status the API can answer with', () => {
    expect(STATUSES.map((s) => s.status)).toEqual(
      expect.arrayContaining([
        'CREATE_REQUESTED',
        'CREATED',
        'MANIFESTED',
        'PICKUP_SCHEDULED',
        'IN_TRANSIT',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'RTO_INITIATED',
        'RTO_DELIVERED',
        'CANCELLED',
        'FAILED',
      ]),
    );
  });
});
