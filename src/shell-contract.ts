import type { ReactNode } from 'react';

/**
 * The contract between the container and the portals. The container implements it and hands it to
 * each portal as a prop; a portal never creates its own HTTP client or handles the token. Each
 * portal keeps a copy of these types (`src/shell-contract.ts`), so it compiles without the container.
 */

export type Role = 'ADMIN' | 'SELLER' | 'OPTOMETRIST' | 'SERVICE';

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

/** Every failure of the API, already normalized, with the message the person should read. */
export interface ApiErrorInfo {
  /** HTTP status; 0 when there was no answer (network) and -1 for a timeout. */
  status: number;
  code: string;
  message: string;
  details: ApiFieldError[];
  traceId: string | null;
  userMessage: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
  idempotencyKey?: string;
  query?: Record<string, string | number | boolean | null | undefined>;
}

/** The only door to the gateway. Paths are relative (`/api/v1/...`). */
export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorInfo }
  | { status: 'ready'; data: T };

export interface FieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  children: (aria: { 'aria-describedby': string | undefined; 'aria-invalid': boolean }) => ReactNode;
}

export interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  type?: 'text' | 'email' | 'tel' | 'date' | 'password' | 'search' | undefined;
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | undefined;
  maxLength?: number | undefined;
  autoComplete?: string | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
}

export interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  /** Text of the empty option; when omitted there is no empty option. */
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
}

export interface DataStateProps<T> {
  state: LoadState<T>;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyHint?: string;
  onRetry: () => void;
  children: (data: T) => ReactNode;
}

export interface SubmitResult<T> {
  submit: () => Promise<T | undefined>;
  pending: boolean;
  error: ApiErrorInfo | null;
  /** Server errors of the form by field name, ready to show next to each input. */
  fieldErrors: Record<string, string>;
  clearError: () => void;
}

/** Components and hooks that must not be repeated in every portal. */
export interface SharedUi {
  DataState: <T>(props: DataStateProps<T>) => ReactNode;
  Field: (props: FieldProps) => ReactNode;
  /** Label, input and error tied together (aria-describedby, aria-invalid). */
  TextField: (props: TextFieldProps) => ReactNode;
  SelectField: (props: SelectFieldProps) => ReactNode;
  PageHeader: (props: { title: string; subtitle?: string; actions?: ReactNode }) => ReactNode;
  Pager: (props: { meta: PageMeta; onPage: (page: number) => void }) => ReactNode;
  Banner: (props: { kind: 'error' | 'info' | 'success'; title?: string; children: ReactNode }) => ReactNode;
  Badge: (props: { tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'; children: ReactNode }) => ReactNode;
  /** Loads data; a newer request replaces the previous one so a slow answer never overwrites a fast one. */
  useLoad: <T>(loader: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[]) => {
    state: LoadState<T>;
    reload: () => void;
  };
  /** A value that settles after the person stops typing, so a search box does not fire a request per key. */
  useDebounced: <T>(value: T, delayMs: number) => T;
  /**
   * Runs a creation with an Idempotency-Key that is kept while the same data is retried, so a double
   * click or a retry after a timeout never creates two records. The button must use {@code pending}.
   */
  useSubmit: <T>(
    action: (idempotencyKey: string) => Promise<T>,
    fingerprint: string,
  ) => SubmitResult<T>;
}

/** What every portal receives, also the identity portal before there is a session. */
export interface PublicShellContext {
  api: ApiClient;
  ui: SharedUi;
  notify: (message: string, kind?: 'success' | 'error' | 'info') => void;
  /** Called by the identity portal after a successful sign-in; the container keeps the token, the portal never sees it. */
  signIn: (accessToken: string, user: SessionUser) => void;
}

export interface ShellContext extends PublicShellContext {
  user: SessionUser;
  can: (...roles: Role[]) => boolean;
  signOut: () => void;
}
