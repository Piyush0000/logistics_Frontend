import type { DataResult } from '../../data/source';

/** A mock lookup that found nothing, shaped like a gateway 404 so pages can call notFound(). */
export function mockNotFound(what: string): DataResult<never> {
  return { ok: false, source: 'mock', error: { kind: 'not_found', status: 404, message: `${what} not found.` } };
}
