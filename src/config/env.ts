/**
 * Runtime configuration.
 *
 * The deploy target is unknown (the university IT service deploys), so the
 * same build must run anywhere. Resolution order for each value:
 *   1. `window.__APP_CONFIG__` — set by `public/config.js`, editable after build
 *   2. `import.meta.env.VITE_*` — baked in at build time
 *   3. a safe default (same-origin API)
 */

export interface AppConfig {
  /** Base URL of the backend, without trailing slash. Empty = same origin. */
  apiUrl: string
  /** Show the "Sign in with Discord" button. */
  discordLogin: boolean
}

interface RawConfig {
  apiUrl?: unknown
  discordLogin?: unknown
}

declare global {
  interface Window {
    __APP_CONFIG__?: RawConfig
  }
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string' && value.trim() !== '') {
    return !['false', '0', 'no', 'off'].includes(value.trim().toLowerCase())
  }
  return fallback
}

export function normalizeBaseUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\/+$/, '')
}

export function resolveConfig(
  runtime: RawConfig | undefined,
  buildEnv: Record<string, string | boolean | undefined>,
): AppConfig {
  const apiUrl = normalizeBaseUrl(runtime?.apiUrl ?? buildEnv.VITE_API_URL)
  const discordLogin = asBoolean(runtime?.discordLogin ?? buildEnv.VITE_DISCORD_LOGIN, true)
  return { apiUrl, discordLogin }
}

export const config: AppConfig = resolveConfig(
  typeof window === 'undefined' ? undefined : window.__APP_CONFIG__,
  import.meta.env,
)

/** Absolute or same-origin URL for an API path such as `/api/v1/tournaments`. */
export function apiUrl(path: string, base: string = config.apiUrl): string {
  return `${base}${path}`
}

/** WebSocket URL for an API path, derived from the API base (http→ws, https→wss). */
export function wsUrl(
  path: string,
  base: string = config.apiUrl,
  location: Pick<Location, 'protocol' | 'host'> = window.location,
): string {
  if (base) {
    return `${base.replace(/^http/i, 'ws')}${path}`
  }
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${location.host}${path}`
}
