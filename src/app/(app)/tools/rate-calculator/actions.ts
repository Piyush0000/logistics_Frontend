'use server';

import { getDemoSession } from '@/lib/auth/session';
import { parseQuoteInput, ratesService, sortQuotes } from '@/lib/data/rates';
import type { DataSource } from '@/lib/data/source';
import type { QuoteFieldErrors, RateQuote } from '@/lib/data/rates';

export type QuoteActionResult =
  | { ok: true; source: DataSource; quotes: RateQuote[] }
  | { ok: false; message: string; errors?: QuoteFieldErrors };

// Server actions can be called directly, so this checks the session and the input itself.
export async function quoteAction(input: unknown): Promise<QuoteActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: 'Sign in again.' };

  const parsed = parseQuoteInput(input);
  if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors };

  const result = await ratesService().quote(parsed.value);
  if (!result.ok) {
    return {
      ok: false,
      message: result.error.kind === 'unauthorized' ? 'Sign in again.' : result.error.message,
    };
  }
  return { ok: true, source: result.source, quotes: sortQuotes(result.data) };
}
