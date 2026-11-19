import { getDemoSession } from '@/lib/auth/session';
import { merchantCredential } from '@/lib/auth/credentials';

/**
 * The courier's shipping label as a PDF. The gateway fetches it fresh from the courier on every
 * request (courier links expire), so this streams it through with the merchant's session.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // This route is reachable directly, so it cannot rely on the page's own check.
  if (!(await getDemoSession())) return new Response('Sign in again.', { status: 401 });

  const { id } = await params;
  const token = await merchantCredential('shipments');
  if (!token) return new Response('Labels are available for live shipments only.', { status: 404 });

  const base = (process.env.GATEWAY_URL || 'http://localhost:8080').replace(/\/+$/, '');
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/v1/shipments/${encodeURIComponent(id)}/label`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(25_000),
      cache: 'no-store',
    });
  } catch {
    return new Response('Could not reach the courier. Try again in a moment.', { status: 502 });
  }

  if (!upstream.ok) {
    const message = await upstream
      .json()
      .then((body: { message?: unknown }) => (typeof body.message === 'string' ? body.message : null))
      .catch(() => null);
    return new Response(message ?? 'The label is not available yet. Try again shortly.', {
      status: upstream.status,
    });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ?? `attachment; filename="${id}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
