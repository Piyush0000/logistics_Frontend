import { z } from 'zod';
import { adminToken } from '@/lib/admin/data/admin-fetch';
import { getAdminSession } from '@/lib/admin/session';
import { gatewayFetch } from '@/lib/gateway/client';

// The admin panel's names for each document, and identity's.
const KIND: Record<string, string> = {
  gst_certificate: 'gst',
  pan_card: 'pan',
  cancelled_cheque: 'cheque',
};
const TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

/**
 * One merchant KYC document, shown in the browser. Admins only. The file is served sandboxed,
 * so even a crafted PDF cannot run script on this origin.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; kind: string }> },
) {
  // This route is reachable directly, so it checks the admin session itself.
  if (!(await getAdminSession())) return new Response('Sign in again.', { status: 401 });
  const { id, kind } = await params;
  const identityKind = KIND[kind];
  if (!identityKind || !/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found.', { status: 404 });

  const result = await gatewayFetch(
    `/api/v1/admin/merchants/${encodeURIComponent(id)}/documents/${identityKind}`,
    {
      schema: z.object({ name: z.string(), content_type: z.string(), data_base64: z.string() }),
      token: adminToken(),
      timeoutMs: 30_000,
    },
  );
  if (!result.ok) {
    return new Response(result.error.message, { status: result.error.kind === 'not_found' ? 404 : 502 });
  }
  const type = TYPES.has(result.data.content_type) ? result.data.content_type : 'application/octet-stream';
  const name = result.data.name.replace(/[^\w.\- ]+/g, '_');
  return new Response(Buffer.from(result.data.data_base64, 'base64'), {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `inline; filename="${name}"`,
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self' data:; object-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
