const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ""
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ""
const AUTH_SESSION_KEY = "quiz-supabase-auth-session-v1"

export interface SupabaseAuthSession {
  accessToken: string
  refreshToken: string
  userId: string
  email: string | null
  expiresAt: number
}

interface AuthResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: {
    id?: string
    email?: string | null
  }
}

function isConfigured() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
}

function authHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  }
}

function parseAuthResponse(payload: AuthResponse): SupabaseAuthSession {
  const accessToken = payload.access_token
  const refreshToken = payload.refresh_token
  const expiresIn = Number(payload.expires_in ?? 0)
  const userId = payload.user?.id ?? ""

  if (!accessToken || !refreshToken || !userId || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new Error("Supabase Auth trả về dữ liệu không hợp lệ")
  }

  return {
    accessToken,
    refreshToken,
    userId,
    email: payload.user?.email ?? null,
    expiresAt: Date.now() + expiresIn * 1000,
  }
}

function readSessionRaw(): SupabaseAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SupabaseAuthSession>
    if (
      !parsed ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.userId !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null
    }

    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      userId: parsed.userId,
      email: typeof parsed.email === "string" ? parsed.email : null,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

function writeSession(session: SupabaseAuthSession) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
}

export function clearSupabaseAuthSession() {
  localStorage.removeItem(AUTH_SESSION_KEY)
}

export function getSupabaseAuthSession() {
  return readSessionRaw()
}

export async function refreshSupabaseAuthSession(): Promise<SupabaseAuthSession | null> {
  if (!isConfigured()) return null

  const current = readSessionRaw()
  if (!current) return null

  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: current.refreshToken }),
  })

  if (!res.ok) {
    clearSupabaseAuthSession()
    return null
  }

  const payload = (await res.json()) as AuthResponse
  const session = parseAuthResponse(payload)
  writeSession(session)
  return session
}

export async function getSupabaseValidAccessToken(): Promise<string | null> {
  const session = readSessionRaw()
  if (!session) return null

  const expiresSoon = session.expiresAt - Date.now() < 60_000
  if (!expiresSoon) return session.accessToken

  const refreshed = await refreshSupabaseAuthSession()
  return refreshed?.accessToken ?? null
}

export function getSupabaseAuthUserId(): string | null {
  return readSessionRaw()?.userId ?? null
}

export async function signInWithSupabase(email: string, password: string): Promise<SupabaseAuthSession> {
  if (!isConfigured()) {
    throw new Error("Thiếu cấu hình Supabase trên app")
  }

  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  })

  const payload = (await res.json().catch(() => ({}))) as AuthResponse & { error_description?: string; msg?: string }
  if (!res.ok) {
    throw new Error(payload.error_description || payload.msg || "Đăng nhập Supabase thất bại")
  }

  const session = parseAuthResponse(payload)
  writeSession(session)
  return session
}

export async function signUpWithSupabase(email: string, password: string): Promise<SupabaseAuthSession | null> {
  if (!isConfigured()) {
    throw new Error("Thiếu cấu hình Supabase trên app")
  }

  const url = `${SUPABASE_URL}/auth/v1/signup`
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  })

  const payload = (await res.json().catch(() => ({}))) as AuthResponse & { error_description?: string; msg?: string }
  if (!res.ok) {
    throw new Error(payload.error_description || payload.msg || "Đăng ký Supabase thất bại")
  }

  if (!payload.access_token) {
    return null
  }

  const session = parseAuthResponse(payload)
  writeSession(session)
  return session
}