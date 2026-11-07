import type { NextRequest } from 'next/server';
import { getDemoSession } from '@/lib/auth/session';
import { codService } from '@/lib/data/cod';
import { remittancesToCsv } from '@/lib/data/cod/csv';
import { parseCodFilters } from '@/lib/data/cod/filters';

export async function GET(request: NextRequest) {
  // This route is reachable directly, so it cannot rely on the page's own check.
  if (!(await getDemoSession())) return new Response('Sign in again.', { status: 401 });

  const { filters, error } = parseCodFilters(Object.fromEntries(request.nextUrl.searchParams));
  if (error) return new Response(error, { status: 400 });

  const result = await codService().exportRemittances(filters);
  if (!result.ok) return new Response(result.error.message, { status: 503 });

  const name = result.source === 'mock' ? 'cod-remittance-sample.csv' : 'cod-remittance.csv';

  return new Response(remittancesToCsv(result.data, result.source), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  });
}
