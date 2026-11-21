import { getDemoSession } from '@/lib/auth/session';
import { companyService, DOCUMENT_TYPES, MAX_DOCUMENT_BYTES, type DocumentKind } from '@/lib/data/company';

const KINDS: readonly DocumentKind[] = ['gst', 'pan', 'cheque'];

const fail = (message: string, status = 400) => Response.json({ ok: false, message }, { status });

/**
 * Uploads one KYC document (multipart field `file`). The company form calls this for each chosen
 * file before it saves the details, so a file never passes through a server action.
 */
export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  // This route is reachable directly, so it checks the session itself.
  if (!(await getDemoSession())) return fail('Sign in again.', 401);

  const { kind } = await params;
  if (!KINDS.includes(kind as DocumentKind)) return fail('Unknown document.', 404);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get('file');
  } catch {
    return fail('We could not read that file. Choose it again.');
  }
  if (!(file instanceof File) || file.size === 0) return fail('Choose a file.');
  if (file.size > MAX_DOCUMENT_BYTES) return fail('Each file can be up to 5 MB.');
  if (!(DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
    return fail('Use a PDF, JPG or PNG file.');
  }

  const result = await companyService().uploadDocument(kind as DocumentKind, {
    name: file.name.slice(0, 200),
    type: file.type,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  if (!result.ok) {
    return fail(
      result.error.kind === 'unauthorized' ? 'Sign in again.' : result.error.message,
      result.error.status && result.error.status >= 400 ? result.error.status : 502,
    );
  }
  return Response.json({ ok: true });
}
