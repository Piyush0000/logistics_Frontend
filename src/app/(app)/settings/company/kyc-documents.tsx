'use client';

import { useId } from 'react';
import { FIELD_LABEL } from '@/components/ui/field-styles';
import { DOCUMENT_KINDS, MAX_DOCUMENT_BYTES, type DocumentKind } from '@/lib/data/company';

const FILE_INPUT =
  'min-h-11 w-full min-w-0 rounded-control border border-secondary bg-surface px-3 py-2 text-base focus:border-primary focus:outline-none lg:text-sm file:mr-3 file:rounded-control file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary';

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function DocumentField({
  label,
  chosen,
  onChange,
  onFile,
}: {
  label: string;
  chosen: File | null;
  onChange: (file: File | null) => void;
  onFile?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className={FILE_INPUT}
      />
      {chosen ? (
        <p className="mt-1 text-sm [overflow-wrap:anywhere]">
          {chosen.name} <span className="text-on-surface/60">({formatSize(chosen.size)})</span>
        </p>
      ) : onFile ? (
        <p className="mt-1 text-sm text-on-surface/70 [overflow-wrap:anywhere]">Recorded: {onFile}</p>
      ) : null}
    </div>
  );
}

/** One file box per document kind. Only each file's name, type and size are sent when saving. */
export function KycDocuments({
  files,
  onChange,
  onFile,
}: {
  files: Record<DocumentKind, File | null>;
  onChange: (kind: DocumentKind, file: File | null) => void;
  onFile: Partial<Record<DocumentKind, string>>;
}) {
  return (
    <fieldset className="grid min-w-0 gap-4">
      <legend className="font-heading text-lg leading-7">KYC documents</legend>
      <p className="text-sm text-on-surface/70">
        Files are not uploaded yet. Only each file&apos;s name, type and size are recorded.
      </p>
      <p className="text-sm text-on-surface/70">
        One file for each, as PDF, JPG or PNG, up to {MAX_DOCUMENT_BYTES / (1024 * 1024)} MB.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {DOCUMENT_KINDS.map(({ kind, label }) => (
          <DocumentField
            key={kind}
            label={label}
            chosen={files[kind]}
            onChange={(file) => onChange(kind, file)}
            onFile={onFile[kind]}
          />
        ))}
      </div>
    </fieldset>
  );
}
