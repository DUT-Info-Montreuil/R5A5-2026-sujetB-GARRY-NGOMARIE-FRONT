import { apiUrl } from '@/config/env'

/** Error raised for any non-2xx response or network failure. */
export class ApiError extends Error {
  readonly status: number
  readonly detail: unknown

  constructor(status: number, detail: unknown, message?: string) {
    super(message ?? (typeof detail === 'string' ? detail : `HTTP ${status}`))
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }

  /** `0` = the request never reached the server (offline, DNS, CORS…). */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  /**
   * The route itself does not exist on this backend version (FastAPI's default
   * 404 body is exactly "Not Found"; unknown method → 405). Used to show
   * "coming soon" instead of a scary error for features the API lacks.
   */
  get isNotImplemented(): boolean {
    return (this.status === 404 && this.detail === 'Not Found') || this.status === 405
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | undefined>
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = apiUrl(path)
  if (!query) return url
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, value)
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/**
 * Thin fetch wrapper. Auth is the HttpOnly `session` cookie, so every call
 * sends credentials; no token is ever handled in JavaScript.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, null, 'Network error')
  }

  const payload = await parseBody(response)
  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : payload
    throw new ApiError(response.status, detail)
  }
  return payload as T
}
