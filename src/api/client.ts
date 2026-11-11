import { useSession } from '../store/session';
import { API_URL } from './config';

/** Any failed API call. `code` is the server's machine-readable code, or NETWORK when it couldn't be reached. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type Options = { body?: unknown; idempotencyKey?: string; auth?: boolean };

const TIMEOUT_MS = 15_000;

async function send(method: Method, path: string, { body, idempotencyKey, auth = true }: Options): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const token = useSession.getState().accessToken;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Can’t reach Deegee. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

// One refresh at a time: if several calls hit an expired token together, they all wait for the same refresh.
let refreshing: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = useSession.getState().refreshToken;
    if (!refreshToken) return false;
    try {
      const res = await send('POST', '/v1/auth/refresh', { body: { refreshToken }, auth: false });
      if (!res.ok) return false;
      const t = (await res.json()) as { accessToken: string; refreshToken: string };
      useSession.getState().setTokens(t.accessToken, t.refreshToken);
      return true;
    } catch {
      return false;
    }
  })().finally(() => { refreshing = null; });
  return refreshing;
}

async function toError(res: Response): Promise<ApiError> {
  let problem: Record<string, unknown> = {};
  try {
    problem = (await res.json()) as Record<string, unknown>;
  } catch {
    // not JSON (e.g. a proxy error page)
  }
  const { code, detail, ...rest } = problem;
  return new ApiError(
    res.status,
    typeof code === 'string' ? code : `HTTP_${res.status}`,
    typeof detail === 'string' ? detail : 'Something went wrong. Try again.',
    rest,
  );
}

/** Calls the Deegee API. Refreshes an expired access token once; if that fails the user is signed out. */
export async function api<T>(method: Method, path: string, options: Options = {}): Promise<T> {
  let res = await send(method, path, options);
  if (res.status === 401 && options.auth !== false && useSession.getState().refreshToken) {
    if (await refreshTokens()) {
      res = await send(method, path, options);
    } else {
      useSession.getState().signOut();
    }
  }
  if (!res.ok) throw await toError(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
