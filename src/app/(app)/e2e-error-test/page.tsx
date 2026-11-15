import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { errorRouteEnabled } from './guard';

// Browser-test route (a leading underscore would make Next skip the folder). It answers 404
// everywhere except the test server that sets E2E_ERROR_ROUTE=on, and it throws only there.
export default async function ErrorTestPage() {
  if (!errorRouteEnabled()) notFound();
  const store = await cookies();
  if (store.get('e2e-error-recovered')?.value !== '1') throw new Error('E2E error route');
  return <h1 className="font-heading text-2xl">Recovered</h1>;
}
