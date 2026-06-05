const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('hce_token')
}

export async function apiFetchBinary(path: string, body: ArrayBuffer, contentType = 'application/pdf'): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': contentType }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Error ${res.status}`)
  }
}

type OpcionesFetch = RequestInit & { skipAuth?: boolean }

export async function apiFetch<T>(path: string, opciones: OpcionesFetch = {}): Promise<T> {
  const { skipAuth, ...init } = opciones

  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  if (!skipAuth) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (res.status === 401) {
    // Token expirado o inválido — limpiar sesión y recargar
    localStorage.removeItem('hce_token')
    localStorage.removeItem('hce_sesion')
    window.location.href = '/login'
    throw new Error('Sesión expirada')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Error ${res.status}`)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return null as T
  }

  return res.json()
}
