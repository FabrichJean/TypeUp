/** Un morceau de texte venu d'une source, prêt à être tapé. */
export interface Excerpt {
  title: string
  text: string
}

export interface FetchOptions {
  fetchFn?: typeof fetch
  timeoutMs?: number
}

/**
 * GET + JSON avec délai maximal. Ne lève jamais d'exception : renvoie `null`
 * si le réseau échoue, si le délai est dépassé, si le statut HTTP est en erreur
 * ou si le corps n'est pas du JSON.
 */
export async function fetchJson(
  url: string,
  { fetchFn = fetch, timeoutMs = 4000 }: FetchOptions = {},
): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetchFn(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
