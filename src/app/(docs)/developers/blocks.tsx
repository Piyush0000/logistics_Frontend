import type { ReactNode } from 'react';
import { API_BASE, codeSamples, type Endpoint, type Field } from '@/content/developers/reference';
import { CodeTabs } from './code-tabs';

const METHOD_TONE: Record<string, string> = {
  GET: 'bg-success/15 text-success',
  POST: 'bg-primary/15 text-primary',
  PUT: 'bg-warning/20 text-on-surface',
  PATCH: 'bg-warning/20 text-on-surface',
  DELETE: 'bg-error/15 text-error',
};

export function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 font-mono text-xs font-bold ${METHOD_TONE[method] ?? ''}`}>
      {method}
    </span>
  );
}

export function Json({ value }: { value: unknown }) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="overflow-x-auto rounded-control border border-secondary bg-surface p-3 font-mono text-xs leading-5">
      <code>{text}</code>
    </pre>
  );
}

export function Heading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-heading text-xl font-bold tracking-tight">
      {children}
    </h2>
  );
}

export function Table({ head, rows }: { head?: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-control border border-secondary bg-surface">
      <table className="w-full border-collapse text-left text-sm">
        {head ? (
        <thead>
          <tr className="border-b border-secondary text-xs text-on-surface/70">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        ) : null}
        <tbody className="divide-y divide-secondary">
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Fields({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <Table
        head={['Field', 'Type', 'Description']}
        rows={fields.map((f) => [
          <span key="n" className="font-mono text-xs whitespace-nowrap">
            {f.name}
            {f.required ? <span className="ml-1 text-error">*</span> : null}
          </span>,
          <span key="t" className="font-mono text-xs text-on-surface/70">
            {f.type}
          </span>,
          f.description,
        ])}
      />
    </div>
  );
}

/** One endpoint: what it does, its inputs, an example request in three languages, and the answer. */
export function EndpointBlock({ endpoint }: { endpoint: Endpoint }) {
  return (
    <section
      id={endpoint.id}
      aria-labelledby={`${endpoint.id}-title`}
      className="grid grid-cols-[minmax(0,1fr)] scroll-mt-24 gap-4 rounded-card border border-secondary bg-surface p-4 lg:p-5"
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
        <h3 id={`${endpoint.id}-title`} className="font-heading text-lg font-bold">
          {endpoint.title}
        </h3>
        <p className="flex flex-wrap items-center gap-2">
          <MethodBadge method={endpoint.method} />
          <code className="font-mono text-sm [overflow-wrap:anywhere]">{endpoint.path}</code>
        </p>
        <p className="text-sm text-on-surface/80">{endpoint.summary}</p>
        {endpoint.roles ? (
          <p className="text-xs text-on-surface/60">Team roles allowed: {endpoint.roles}. API keys may call it.</p>
        ) : null}
      </div>
      {endpoint.pathParams ? <Fields title="Path" fields={endpoint.pathParams} /> : null}
      {endpoint.query ? <Fields title="Query" fields={endpoint.query} /> : null}
      {endpoint.body ? <Fields title="Body (JSON)" fields={endpoint.body} /> : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <h4 className="text-sm font-semibold">Example request</h4>
        <CodeTabs samples={codeSamples(endpoint)} />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
        <h4 className="text-sm font-semibold">Response {endpoint.response.status}</h4>
        <Json value={endpoint.response.example} />
        {endpoint.response.note ? <p className="text-xs text-on-surface/70">{endpoint.response.note}</p> : null}
      </div>
      {endpoint.errors?.length ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <h4 className="text-sm font-semibold">Errors</h4>
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-1 text-sm">
            {endpoint.errors.map((e) => (
              <li key={e.status + e.when}>
                <span className="font-mono font-semibold">{e.status}</span> {e.when}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {endpoint.notes?.map((note) => (
        <p key={note} className="rounded-control border border-warning/40 bg-warning/10 p-3 text-sm">
          {note}
        </p>
      ))}
    </section>
  );
}

export const BASE_URL = API_BASE;
