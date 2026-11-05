import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Terms and policies | Evoc Logistics' };

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10 sm:py-16">
      <h1 className="font-heading text-[27px] leading-8 font-extrabold text-primary sm:text-[34px] sm:leading-[41px]">
        Terms and policies
      </h1>
      <p className="mt-4 text-base leading-[26px] text-on-surface/70">
        The final terms and policies will be published here.
      </p>
      <Link href="/login" className="mt-6 inline-flex min-h-11 items-center font-extrabold text-primary">
        Back to sign in
      </Link>
    </main>
  );
}
