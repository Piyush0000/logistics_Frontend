'use client';

import Link from 'next/link';
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { emailSchema } from '@/lib/auth/login-schema';
import { passwordSignInAction, requestOtpAction } from './actions';
import { EmailField, FormError, PasswordField, SubmitButton, TermsField } from './fields';
import { IDLE, type LoginState } from './login-state';
import { OtpStep } from './otp-step';

type Method = 'otp' | 'password';

const METHODS: { id: Method; label: string }[] = [
  { id: 'otp', label: 'Email OTP' },
  { id: 'password', label: 'Email + Password' },
];

/**
 * Submits without the `action` prop, because React resets a form after an action and that
 * clears a controlled checkbox on screen while its state stays ticked.
 */
function submitWith(action: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
}

function MethodTabs({ method, onChange }: { method: Method; onChange: (method: Method) => void }) {
  const refs = useRef<Partial<Record<Method, HTMLButtonElement | null>>>({});
  const other: Method = method === 'otp' ? 'password' : 'otp';

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const targets: Record<string, Method> = {
      ArrowLeft: other,
      ArrowRight: other,
      Home: 'otp',
      End: 'password',
    };
    const next = targets[event.key];
    if (!next) return;
    event.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Sign-in method"
      onKeyDown={handleKeyDown}
      className="grid grid-cols-2 gap-1 rounded-control bg-muted p-1"
    >
      {METHODS.map(({ id, label }) => {
        const selected = id === method;
        return (
          <button
            key={id}
            ref={(element) => {
              refs.current[id] = element;
            }}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="login-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            className={`h-11 rounded-[10px] px-2 text-sm font-extrabold transition-colors ${
              selected ? 'bg-surface text-primary' : 'text-on-surface/70 hover:text-primary'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

interface DetailsProps {
  emailField: ReactNode;
  termsField: ReactNode;
  canContinue: boolean;
}

function OtpDetails({
  emailField,
  termsField,
  canContinue,
  onSent,
}: DetailsProps & { onSent: (email: string, demoCode?: string) => void }) {
  const [state, action, pending] = useActionState(async (previous: LoginState, data: FormData) => {
    const next = await requestOtpAction(previous, data);
    if (next.status === 'code_sent') onSent(next.email, next.demoCode);
    return next;
  }, IDLE);

  return (
    <form onSubmit={submitWith(action)} noValidate className="grid gap-4">
      {emailField}
      {termsField}
      {state.status === 'error' ? <FormError message={state.message} /> : null}
      <SubmitButton pending={pending} pendingLabel="Sending code" disabled={!canContinue}>
        Send verification code
      </SubmitButton>
    </form>
  );
}

function PasswordDetails({ emailField, termsField, canContinue }: DetailsProps) {
  const [password, setPassword] = useState('');
  const [state, action, pending] = useActionState(passwordSignInAction, IDLE);

  return (
    <form onSubmit={submitWith(action)} noValidate className="grid gap-4">
      {emailField}
      <PasswordField value={password} onChange={setPassword} />
      {termsField}
      {state.status === 'error' ? <FormError message={state.message} /> : null}
      <SubmitButton
        pending={pending}
        pendingLabel="Signing in"
        disabled={!canContinue || password === ''}
      >
        Sign in
      </SubmitButton>
    </form>
  );
}

export function LoginForm() {
  const [method, setMethod] = useState<Method>('otp');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState(false);
  const [otp, setOtp] = useState<{ email: string; demoCode?: string } | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  // A slow phone can show the form before scripts load, so pick up anything already entered.
  useEffect(() => {
    if (emailRef.current?.value) setEmail(emailRef.current.value);
    if (termsRef.current?.checked) setTerms(true);
  }, []);

  if (otp) {
    return <OtpStep email={otp.email} demoCode={otp.demoCode} onBack={() => setOtp(null)} />;
  }

  const details: DetailsProps = {
    canContinue: terms && emailSchema.safeParse(email).success,
    emailField: <EmailField value={email} onChange={setEmail} inputRef={emailRef} />,
    termsField: <TermsField checked={terms} onChange={setTerms} inputRef={termsRef} />,
  };

  return (
    <div className="grid gap-4">
      <MethodTabs method={method} onChange={setMethod} />
      <div id="login-panel" role="tabpanel" aria-labelledby={`tab-${method}`}>
        {method === 'otp' ? (
          <OtpDetails
            {...details}
            onSent={(sentEmail, demoCode) => setOtp({ email: sentEmail, demoCode })}
          />
        ) : (
          <PasswordDetails {...details} />
        )}
      </div>
      <Link
        href="/terms"
        target="_blank"
        className="flex h-control items-center justify-center rounded-control border border-secondary px-4 text-sm font-extrabold transition-colors hover:border-primary hover:text-primary"
      >
        View terms and policies
      </Link>
    </div>
  );
}
