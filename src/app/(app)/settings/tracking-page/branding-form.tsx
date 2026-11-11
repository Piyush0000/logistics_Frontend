'use client';

import { useId, useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from '@/components/ui/dialog';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import {
  checkLogo,
  MAX_DISPLAY_NAME,
  type BrandingFieldErrors,
  type TrackingAccent,
  type TrackingPageBranding,
} from '@/lib/data/tracking-page';
import { saveTrackingPageAction } from './actions';
import { TrackingPreview } from './preview';

const INPUT = 'h-control w-full min-w-0 rounded-control border bg-surface px-3 text-base lg:text-sm';

const ACCENT_OPTIONS: { value: TrackingAccent; label: string; swatch: string }[] = [
  { value: 'primary', label: 'Primary blue', swatch: 'bg-primary' },
  { value: 'accent', label: 'Sky blue', swatch: 'bg-accent' },
  { value: 'success', label: 'Green', swatch: 'bg-success' },
];

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
  inputMode?: 'tel' | 'email' | 'text';
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
        <p id={`${id}-error`} className="mt-1 text-sm [overflow-wrap:anywhere]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Branding fields beside a live preview of the public tracking page. Nothing here reaches buyers yet. */
export function BrandingForm({ branding }: { branding: TrackingPageBranding }) {
  const [displayName, setDisplayName] = useState(branding.displayName);
  const [supportEmail, setSupportEmail] = useState(branding.supportEmail);
  const [supportPhone, setSupportPhone] = useState(branding.supportPhone);
  const [accent, setAccent] = useState<TrackingAccent>(branding.accent);
  const [showCourier, setShowCourier] = useState(branding.showCourier);
  // The chosen file's details (never its bytes), and whether the saved logo is to be removed.
  const [logoFile, setLogoFile] = useState<{ name: string; type: string; size: number } | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [errors, setErrors] = useState<BrandingFieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const logoId = useId();
  const switchId = useId();
  const groupId = useId();

  const logoName = logoFile ? logoFile.name : removeLogo ? null : branding.logoName;

  function handleLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const details = { name: file.name, type: file.type, size: file.size };
    const problem = checkLogo(details);
    setLogoError(problem);
    if (problem) {
      setFileKey((key) => key + 1);
      return;
    }
    setLogoFile(details);
    setRemoveLogo(false);
  }

  function clearLogo() {
    setLogoFile(null);
    setRemoveLogo(true);
    setLogoError(null);
    setFileKey((key) => key + 1);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const result = await saveTrackingPageAction({
        displayName,
        supportEmail,
        supportPhone,
        accent,
        showCourier,
        logo: logoFile ?? (removeLogo ? 'remove' : 'keep'),
      });
      setErrors(result.ok ? {} : (result.errors ?? {}));
      if (result.ok) {
        setLogoFile(null);
        setRemoveLogo(false);
        setFileKey((key) => key + 1);
      }
      setFeedback(result.ok || !result.errors ? { ok: result.ok, message: result.message } : null);
    });
  }

  return (
    <div className="grid min-w-0 gap-6">
      <p className="rounded-control bg-muted p-3 text-sm">
        Changes apply to the public page once tracking-page settings are connected.
      </p>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <form noValidate onSubmit={handleSubmit} className="grid min-w-0 gap-5">
          <Field
            label="Display name"
            value={displayName}
            onChange={setDisplayName}
            error={errors.displayName}
            hint={`Up to ${MAX_DISPLAY_NAME} characters. ${displayName.trim().length} used.`}
          />
          <Field
            label="Support email"
            value={supportEmail}
            onChange={setSupportEmail}
            error={errors.supportEmail}
            inputMode="email"
            autoComplete="email"
            hint="Optional. Shown to buyers who need help."
          />
          <Field
            label="Support phone"
            value={supportPhone}
            onChange={setSupportPhone}
            error={errors.supportPhone}
            inputMode="tel"
            autoComplete="tel"
            hint="Optional. 10 to 15 digits, with an optional + at the start."
          />

          <div role="radiogroup" aria-labelledby={groupId} className="min-w-0">
            <p id={groupId} className={FIELD_LABEL}>
              Accent colour
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {ACCENT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${
                    accent === option.value ? 'border-primary bg-muted font-medium' : 'border-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="accent"
                    value={option.value}
                    checked={accent === option.value}
                    onChange={() => setAccent(option.value)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className={`size-4 rounded-full ${option.swatch}`} />
                  {option.label}
                </label>
              ))}
            </div>
            {errors.accent ? <p className="mt-1 text-sm">{errors.accent}</p> : null}
          </div>

          <label htmlFor={switchId} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              id={switchId}
              type="checkbox"
              checked={showCourier}
              onChange={(event) => setShowCourier(event.target.checked)}
              className="size-5 accent-primary"
            />
            Show the courier name
          </label>

          <div className="min-w-0">
            <label htmlFor={logoId} className={FIELD_LABEL}>
              Logo
            </label>
            <input
              key={fileKey}
              id={logoId}
              type="file"
              accept=".png,.svg,image/png,image/svg+xml"
              onChange={handleLogo}
              aria-invalid={logoError ? true : undefined}
              className="block min-h-11 w-full min-w-0 rounded-control border border-secondary bg-surface px-3 py-2 text-base focus:border-primary focus:outline-none lg:text-sm file:mr-3 file:rounded-control file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary"
            />
            <p className="mt-1 text-xs text-on-surface/60">
              PNG or SVG, up to 1 MB. Files are not uploaded yet. Only the file name is kept.
            </p>
            {logoError ? (
              <p role="alert" className="mt-1 text-sm [overflow-wrap:anywhere]">
                {logoError}
              </p>
            ) : null}
            {logoName ? (
              <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
                <p className="min-w-0 text-sm [overflow-wrap:anywhere]">
                  {logoFile ? `Chosen: ${logoFile.name}` : `Logo on file: ${logoName}`}
                </p>
                <button type="button" onClick={clearLogo} className={SECONDARY_BUTTON}>
                  Remove logo
                </button>
              </div>
            ) : null}
          </div>

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
              Save changes
            </button>
          </div>
        </form>

        <div className="min-w-0">
          <h3 className="mb-2 font-heading text-lg leading-7">Preview</h3>
          <TrackingPreview
            displayName={displayName}
            supportEmail={supportEmail}
            supportPhone={supportPhone}
            accent={accent}
            showCourier={showCourier}
            logoName={logoName}
          />
        </div>
      </div>
    </div>
  );
}
