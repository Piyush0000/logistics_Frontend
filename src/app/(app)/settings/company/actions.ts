'use server';

import { revalidatePath } from 'next/cache';
import { getDemoSession } from '@/lib/auth/session';
import {
  checkDocuments,
  companyService,
  parseCompanyInput,
  parseDocuments,
  type CompanyFieldErrors,
} from '@/lib/data/company';

export type CompanyActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string; errors?: CompanyFieldErrors };

const SIGN_IN_AGAIN = 'Sign in again.';
const NOT_UNDERSTOOD = 'We could not read that form. Reload the page and try again.';

/**
 * Only each file's name, type and size arrive here, never its bytes, so the 2 MB server action
 * limit in next.config.ts is not a constraint. The 5 MB limit per file is checked against the size.
 * Server actions can be called directly, so this checks the session and the input itself.
 */
export async function saveCompanyAction(input: unknown): Promise<CompanyActionResult> {
  if (!(await getDemoSession())) return { ok: false, message: SIGN_IN_AGAIN };

  const raw = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const documents = parseDocuments(raw.documents);
  if (!documents) return { ok: false, message: NOT_UNDERSTOOD };

  const details = parseCompanyInput(raw.details);
  if (!details.ok) return { ok: false, message: details.message, errors: details.errors };

  const service = companyService();
  const current = await service.getCompany();
  if (!current.ok) {
    return { ok: false, message: current.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : current.error.message };
  }

  // A kind already on file does not need a new file.
  const problem = checkDocuments(
    documents,
    current.data.documents.map((doc) => doc.kind),
  );
  if (problem) return { ok: false, message: problem };

  const result = await service.saveCompany(details.value, documents);
  if (!result.ok) {
    return { ok: false, message: result.error.kind === 'unauthorized' ? SIGN_IN_AGAIN : result.error.message };
  }
  revalidatePath('/settings/company');
  revalidatePath('/home');
  return { ok: true, message: 'Your details were sent for review.' };
}
