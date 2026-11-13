'use client';

import { useId, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { PRIMARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { checkDocuments, KYC_STATUS_LABEL, type CompanyFieldErrors } from '@/lib/kyc';
import type { CompanyView, DocumentFile, DocumentKind, KycStatus } from '@/lib/data/company/types';
import { saveCompanyAction } from './actions';
import { KycDocuments } from './kyc-documents';

const INPUT = 'h-control w-full min-w-0 rounded-control border bg-surface px-3 text-base lg:text-sm';

const BADGE: Record<KycStatus, string> = {
  not_started: 'bg-muted text-on-surface',
  submitted: 'bg-warning/20 text-on-surface',
  verified: 'bg-success/20 text-on-surface',
  rejected: 'bg-error/15 text-on-surface',
};

function Field({
  label,
  value,
  onChange,
  error,
  hint,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  inputMode?: 'numeric' | 'tel' | 'text';
  autoComplete?: string;
}) {
  const id = useId();
  const describedBy = [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ');
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete ?? 'off'}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${INPUT} ${error ? 'border-error' : 'border-secondary'}`}
      />
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-on-surface/60 [overflow-wrap:anywhere]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 gap-4">
      <legend className="font-heading text-lg leading-7">{title}</legend>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

const upper = (value: string) => value.toUpperCase();
const digits = (value: string) => value.replace(/\D/g, '');

/** Business, address and bank details plus the three KYC documents, saved together for review. */
export function CompanyForm({ company }: { company: CompanyView }) {
  const saved = company.details;
  const [legalName, setLegalName] = useState(saved?.legalName ?? '');
  const [brandName, setBrandName] = useState(saved?.brandName ?? '');
  const [gstin, setGstin] = useState(saved?.gstin ?? '');
  const [pan, setPan] = useState(saved?.pan ?? '');
  const [contact, setContact] = useState(saved?.address.name ?? '');
  const [phone, setPhone] = useState(saved?.address.phone ?? '');
  const [line1, setLine1] = useState(saved?.address.line1 ?? '');
  const [line2, setLine2] = useState(saved?.address.line2 ?? '');
  const [city, setCity] = useState(saved?.address.city ?? '');
  const [state, setState] = useState(saved?.address.state ?? '');
  const [pincode, setPincode] = useState(saved?.address.pincode ?? '');
  const [holder, setHolder] = useState(saved?.bank.holder ?? '');
  // Only the masked number comes back from the server, so the number is typed again on each submit.
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState(saved?.bank.ifsc ?? '');
  const [files, setFiles] = useState<Record<DocumentKind, File | null>>({ gst: null, pan: null, cheque: null });
  const [errors, setErrors] = useState<CompanyFieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const onFile = Object.fromEntries(company.documents.map((doc) => [doc.kind, doc.name]));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    const documents: DocumentFile[] = (Object.keys(files) as DocumentKind[]).flatMap((kind) => {
      const file = files[kind];
      return file ? [{ kind, name: file.name, type: file.type, size: file.size }] : [];
    });
    // The server checks all of this again. Checking here answers without a round trip.
    const problem = checkDocuments(
      documents,
      company.documents.map((doc) => doc.kind),
    );

    startTransition(async () => {
      const result = await saveCompanyAction({
        details: {
          legalName,
          brandName,
          gstin,
          pan,
          address: { name: contact, phone, line1, line2, city, state, country: 'IN', pincode },
          bank: { holder, account, ifsc },
        },
        documents,
      });
      setErrors(result.ok ? {} : (result.errors ?? {}));
      if (result.ok) {
        // The typed number must not stay in the page once it is saved.
        setAccount('');
        setFeedback({ ok: true, message: result.message });
      } else if (!result.errors) {
        setFeedback({ ok: false, message: result.message });
      } else {
        // Field errors sit under their boxes. A missing document still gets its own message.
        setFeedback(problem ? { ok: false, message: problem } : null);
      }
    });
  }

  return (
    <div className="grid gap-6">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        KYC status
        <span
          data-testid="kyc-status"
          className={`rounded-control px-2 py-0.5 text-sm font-medium ${BADGE[company.kycStatus]}`}
        >
          {KYC_STATUS_LABEL[company.kycStatus]}
        </span>
      </p>

      <form noValidate onSubmit={handleSubmit} className="grid gap-8">
        <Section title="Business">
          <Field label="Legal business name" value={legalName} onChange={setLegalName} error={errors.legalName} autoComplete="organization" />
          <Field label="Brand name" value={brandName} onChange={setBrandName} error={errors.brandName} />
          <Field label="GSTIN" value={gstin} onChange={(v) => setGstin(upper(v))} error={errors.gstin} hint="15 characters, such as 27AAPFU0939F1ZV." />
          <Field label="PAN" value={pan} onChange={(v) => setPan(upper(v))} error={errors.pan} hint="10 characters, such as AAPFU0939F." />
        </Section>

        <Section title="Registered address">
          <Field label="Contact name" value={contact} onChange={setContact} error={errors['address.name']} autoComplete="name" />
          <Field label="Contact phone" value={phone} onChange={setPhone} error={errors['address.phone']} inputMode="tel" autoComplete="tel" hint="10 to 15 digits, with an optional + at the start." />
          <Field label="Address line 1" value={line1} onChange={setLine1} error={errors['address.line1']} />
          <Field label="Address line 2 (optional)" value={line2} onChange={setLine2} error={errors['address.line2']} />
          <Field label="City" value={city} onChange={setCity} error={errors['address.city']} />
          <Field label="State" value={state} onChange={setState} error={errors['address.state']} />
          <Field label="Pincode" value={pincode} onChange={(v) => setPincode(digits(v))} error={errors['address.pincode']} inputMode="numeric" />
        </Section>

        <Section title="Bank account">
          <Field label="Account holder name" value={holder} onChange={setHolder} error={errors['bank.holder']} />
          <Field
            label="Account number"
            value={account}
            onChange={(v) => setAccount(digits(v))}
            error={errors['bank.account']}
            inputMode="numeric"
            hint={
              saved
                ? `Account on file: ${saved.bank.account}. Enter it again each time you submit.`
                : '9 to 18 digits. Only the last 4 are shown after you submit.'
            }
          />
          <Field label="IFSC" value={ifsc} onChange={(v) => setIfsc(upper(v))} error={errors['bank.ifsc']} hint="11 characters, with a 0 as the fifth." />
        </Section>

        <KycDocuments files={files} onChange={(kind, file) => setFiles((prev) => ({ ...prev, [kind]: file }))} onFile={onFile} />

        {feedback ? (
          feedback.ok ? (
            <p role="status" className="rounded-control bg-success/15 p-3 text-sm">
              {feedback.message}
            </p>
          ) : (
            <p role="alert" className="rounded-control bg-error/10 p-3 text-sm">
              {feedback.message}
            </p>
          )
        ) : null}

        <div>
          <button type="submit" disabled={pending} className={PRIMARY_BUTTON}>
            Submit for review
          </button>
        </div>
      </form>
    </div>
  );
}
