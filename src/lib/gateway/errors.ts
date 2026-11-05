export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'server'
  | 'upstream'
  | 'unavailable'
  | 'http'
  | 'timeout'
  | 'network'
  | 'invalid_response';

export interface FieldIssue {
  path: string;
  message: string;
}

/** The single error shape screens handle, whichever backend format caused it. */
export interface ApiError {
  kind: ApiErrorKind;
  /** HTTP status, or 0 when no response was received. */
  status: number;
  message: string;
  issues?: FieldIssue[];
  service?: string;
}

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

const KIND_BY_STATUS: Record<number, ApiErrorKind> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  500: 'server',
  502: 'upstream',
  503: 'unavailable',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFieldIssue(value: unknown): value is FieldIssue {
  return isRecord(value) && typeof value.path === 'string' && typeof value.message === 'string';
}

function readMessage(body: Record<string, unknown>): string | undefined {
  const { message } = body;
  if (typeof message === 'string' && message) return message;
  if (Array.isArray(message) && message.length > 0) return message.join(', ');
  return undefined;
}

/** Maps any backend error body to an ApiError. See section 3 of the design spec for the formats. */
export function apiErrorFromResponse(status: number, body: unknown): ApiError {
  const error: ApiError = {
    kind: KIND_BY_STATUS[status] ?? 'http',
    status,
    message: DEFAULT_MESSAGE,
  };
  if (!isRecord(body)) return error;

  if (body.error === 'UPSTREAM_UNAVAILABLE') {
    error.message = 'A backend service is unavailable. Please try again.';
    if (typeof body.service === 'string') error.service = body.service;
    return error;
  }

  if (body.error === 'VALIDATION_FAILED') {
    error.message = 'Some fields need attention.';
    if (Array.isArray(body.issues) && body.issues.every(isFieldIssue)) {
      error.issues = body.issues;
    }
    return error;
  }

  error.message = readMessage(body) ?? DEFAULT_MESSAGE;
  return error;
}
