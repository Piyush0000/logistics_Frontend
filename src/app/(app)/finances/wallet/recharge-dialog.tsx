'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId, useState, useTransition, type FormEvent } from 'react';
import { Dialog, PRIMARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { formatPaise } from '@/lib/format/money';
import {
  parseRechargeRupees,
  RECHARGE_PRESETS_RUPEES,
} from '@/lib/data/wallet/recharge';
import { startRechargeAction } from './actions';

const NO_PAYMENT = "Recharge isn't connected yet. No payment was taken.";

/** The Recharge button, and the popup it opens. `?recharge=1` opens it too. */
export function RechargeDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const open = params.get('recharge') === '1';

  function go(next: boolean) {
    const query = new URLSearchParams(params.toString());
    if (next) query.set('recharge', '1');
    else query.delete('recharge');
    const text = query.toString();
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false });
  }

  return (
    <>
      <button type="button" onClick={() => go(true)} className={PRIMARY_BUTTON}>
        Recharge
      </button>
      {open ? (
        <Dialog title="Recharge wallet" onClose={() => go(false)}>
          <RechargeForm />
        </Dialog>
      ) : null}
    </>
  );
}

function RechargeForm() {
  const inputId = useId();
  const errorId = useId();
  const [text, setText] = useState('1000');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function change(next: string) {
    setText(next);
    setError(null);
    setNotice(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    const parsed = parseRechargeRupees(text);
    if (!parsed.ok) return setError(parsed.message);
    setError(null);

    start(async () => {
      const result = await startRechargeAction(parsed.paise);
      if (!result.ok) return setError(result.message);
      if (result.paymentUrl) window.location.assign(result.paymentUrl);
      else setNotice(NO_PAYMENT);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {RECHARGE_PRESETS_RUPEES.map((rupees) => {
          const selected = text.trim().replace(/,/g, '') === String(rupees);
          return (
            <button
              key={rupees}
              type="button"
              aria-pressed={selected}
              onClick={() => change(String(rupees))}
              className={`inline-flex h-control items-center justify-center rounded-control border px-3 text-sm font-medium ${
                selected ? 'border-primary bg-primary/10 text-primary' : 'border-secondary hover:bg-muted'
              }`}
            >
              {formatPaise(rupees * 100, { decimals: 0 })}
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor={inputId} className={FIELD_LABEL}>
          Amount in rupees
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(event) => change(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-control w-full rounded-control border border-secondary bg-surface px-3 text-base sm:text-sm"
        />
        <p className="mt-1 text-xs leading-4 text-on-surface/70">
          Whole rupees, from ₹100 to ₹5,00,000.
        </p>
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm leading-5 text-error">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-control bg-muted p-3 text-sm leading-5">
          {notice}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
        Recharge
      </button>
    </form>
  );
}
