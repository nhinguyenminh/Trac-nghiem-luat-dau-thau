import type { QuestionProgress } from "../types"
import { getSupabaseAuthSession, getSupabaseAuthUserId, getSupabaseValidAccessToken } from "./SupabaseAuthService"

const PROFILES_KEY = "quiz-profiles-v1"
const ACTIVE_PROFILE_KEY = "quiz-active-profile-v1"
const PROGRESS_PREFIX = "quiz-progress-v2"
const STATS_PREFIX = "quiz-stats-v1"
const SETTINGS_PREFIX = "quiz-settings-v1"
const CLOUD_USER_ID_KEY = "quiz-cloud-user-id-v1"
const CLOUD_SYNC_EVENT = "quiz-cloud-sync-local-change"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ""
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ""
let hasLoggedCloudConfigWarning = false

export interface CloudSyncDebugStatus {
  enabled: boolean
  hasUrl: boolean
  hasAnonKey: boolean
  hasAuthSession: boolean
}

interface LocalStats {
  total: number
  correct: number
  wrong: number
}

interface LocalSettings {
  autoNext: boolean
  showNextButton: boolean
  allowRepeat: boolean
  questionScope: "all" | "first200" | "after200" | "supplement50"
  practiceMode: "normal" | "focusWrongAndStale"
  selectedCategories: string[]
}

interface LocalProfile {
  id: string
  name: string
  password: string
  createdAt: string
  lastLoginAt: string
}

interface LocalSnapshot {
  profiles: LocalProfile[]
  activeProfileId: string | null
  progressByProfile: Record<string, QuestionProgress[]>
  statsByProfile: Record<string, LocalStats>
  settingsByProfile: Record<string, LocalSettings>
}

interface CloudProfileRow {
  id: string
  user_id: string
  name: string
  password_hash: string
  created_at: string
  last_login_at: string
}

interface CloudProgressRow {
  user_id: string
  profile_id: string
  question_id: number
  status: "unseen" | "correct" | "wrong"
  correct_count: number
  wrong_count: number
  total_response_time_ms: number
  last_result: "correct" | "wrong" | null
  last_response_time_ms: number | null
  last_updated: string | null
}

interface CloudStatsRow {
  user_id: string
  profile_id: string
  total: number
  correct: number
  wrong: number
  updated_at: string
}

interface CloudSettingsRow {
  user_id: string
  profile_id: string
  auto_next: boolean
  show_next_button: boolean
  allow_repeat: boolean
  question_scope: "all" | "first200" | "after200" | "supplement50"
  practice_mode: "normal" | "focusWrongAndStale"
  selected_categories: string[]
  updated_at: string
}

function isSupabaseConfigured() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
}

function logCloudConfigWarning() {
  if (hasLoggedCloudConfigWarning) return
  hasLoggedCloudConfigWarning = true
  console.warn("[cloud-sync] disabled: missing Supabase env", {
    hasUrl: SUPABASE_URL.length > 0,
    hasAnonKey: SUPABASE_ANON_KEY.length > 0,
  })
}

function getOrCreateCloudUserId() {
  const existing = localStorage.getItem(CLOUD_USER_ID_KEY)
  if (existing && existing.trim().length > 0) return existing

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `cloud-user-${Date.now()}-${Math.random().toString(16).slice(2)}`
  localStorage.setItem(CLOUD_USER_ID_KEY, generated)
  return generated
}

async function getHeaders() {
  const accessToken = await getSupabaseValidAccessToken()
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  }
}

async function fetchTable<T>(table: string, userId: string): Promise<T[]> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?user_id=eq.${encodeURIComponent(userId)}&select=*`
  const res = await fetch(url, { headers: await getHeaders() })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Fetch ${table} failed: ${res.status} ${body}`)
  }
  return (await res.json()) as T[]
}

async function upsertRows<T>(table: string, rows: T[], onConflict: string) {
  if (rows.length === 0) return

  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(await getHeaders()),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Upsert ${table} failed: ${res.status} ${body}`)
  }
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function readProgressForProfile(profileId: string): QuestionProgress[] {
  const raw = parseJson<Array<Record<string, unknown>>>(localStorage.getItem(`${PROGRESS_PREFIX}:${profileId}`), [])
  return raw
    .map((item) => {
      const questionId = Number(item.questionId)
      if (!Number.isInteger(questionId) || questionId <= 0) return null
      const status = item.status
      if (status !== "unseen" && status !== "correct" && status !== "wrong") return null

      return {
        questionId,
        status,
        correctCount: Math.max(0, Number(item.correctCount) || 0),
        wrongCount: Math.max(0, Number(item.wrongCount) || 0),
        totalResponseTimeMs: Math.max(0, Number(item.totalResponseTimeMs) || 0),
        lastResult: item.lastResult === "correct" || item.lastResult === "wrong" ? item.lastResult : null,
        lastResponseTimeMs: item.lastResponseTimeMs == null ? null : Math.max(0, Number(item.lastResponseTimeMs) || 0),
        lastUpdated: typeof item.lastUpdated === "string" ? new Date(item.lastUpdated) : null,
      } as QuestionProgress
    })
    .filter((item): item is QuestionProgress => item !== null)
}

function readLocalSnapshot(): LocalSnapshot {
  const rawProfiles = parseJson<{ profiles?: LocalProfile[] }>(localStorage.getItem(PROFILES_KEY), { profiles: [] })
  const profiles = Array.isArray(rawProfiles.profiles) ? rawProfiles.profiles : []
  const activeProfileIdRaw = localStorage.getItem(ACTIVE_PROFILE_KEY)
  const activeProfileId = activeProfileIdRaw && activeProfileIdRaw.trim().length > 0 ? activeProfileIdRaw : null

  const progressByProfile: Record<string, QuestionProgress[]> = {}
  const statsByProfile: Record<string, LocalStats> = {}
  const settingsByProfile: Record<string, LocalSettings> = {}

  for (const profile of profiles) {
    if (!profile?.id) continue

    progressByProfile[profile.id] = readProgressForProfile(profile.id)

    const statsRaw = parseJson<Partial<LocalStats>>(localStorage.getItem(`${STATS_PREFIX}:${profile.id}`), {})
    statsByProfile[profile.id] = {
      total: Math.max(0, Number(statsRaw.total) || 0),
      correct: Math.max(0, Number(statsRaw.correct) || 0),
      wrong: Math.max(0, Number(statsRaw.wrong) || 0),
    }

    const settingsRaw = parseJson<Partial<LocalSettings>>(localStorage.getItem(`${SETTINGS_PREFIX}:${profile.id}`), {})
    settingsByProfile[profile.id] = {
      autoNext: settingsRaw.autoNext ?? true,
      showNextButton: settingsRaw.showNextButton ?? true,
      allowRepeat: settingsRaw.allowRepeat ?? true,
      questionScope:
        settingsRaw.questionScope === "first200" ||
        settingsRaw.questionScope === "after200" ||
        settingsRaw.questionScope === "supplement50"
          ? settingsRaw.questionScope
          : "all",
      practiceMode: settingsRaw.practiceMode === "focusWrongAndStale" ? settingsRaw.practiceMode : "normal",
      selectedCategories: Array.isArray(settingsRaw.selectedCategories)
        ? settingsRaw.selectedCategories.filter((item): item is string => typeof item === "string")
        : [],
    }
  }

  return {
    profiles,
    activeProfileId,
    progressByProfile,
    statsByProfile,
    settingsByProfile,
  }
}

function writeLocalSnapshot(snapshot: LocalSnapshot) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify({ profiles: snapshot.profiles }))
  if (snapshot.activeProfileId) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, snapshot.activeProfileId)
  } else {
    localStorage.removeItem(ACTIVE_PROFILE_KEY)
  }

  for (const profile of snapshot.profiles) {
    const profileId = profile.id
    const progress = snapshot.progressByProfile[profileId] ?? []
    const storedProgress = progress.map((item) => ({
      questionId: item.questionId,
      status: item.status,
      correctCount: item.correctCount,
      wrongCount: item.wrongCount,
      totalResponseTimeMs: item.totalResponseTimeMs,
      lastResult: item.lastResult,
      lastResponseTimeMs: item.lastResponseTimeMs,
      lastUpdated: item.lastUpdated ? item.lastUpdated.toISOString() : null,
    }))
    localStorage.setItem(`${PROGRESS_PREFIX}:${profileId}`, JSON.stringify(storedProgress))

    localStorage.setItem(`${STATS_PREFIX}:${profileId}`, JSON.stringify(snapshot.statsByProfile[profileId] ?? { total: 0, correct: 0, wrong: 0 }))
    localStorage.setItem(`${SETTINGS_PREFIX}:${profileId}`, JSON.stringify(snapshot.settingsByProfile[profileId] ?? {
      autoNext: true,
      showNextButton: true,
      allowRepeat: true,
      questionScope: "all",
      practiceMode: "normal",
      selectedCategories: [],
    }))
  }
}

function buildSnapshotFromCloud(
  profileRows: CloudProfileRow[],
  progressRows: CloudProgressRow[],
  statsRows: CloudStatsRow[],
  settingsRows: CloudSettingsRow[],
): LocalSnapshot {
  const profiles: LocalProfile[] = profileRows.map((row) => ({
    id: row.id,
    name: row.name,
    password: row.password_hash,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }))

  const progressByProfile: Record<string, QuestionProgress[]> = {}
  for (const row of progressRows) {
    const list = progressByProfile[row.profile_id] ?? []
    list.push({
      questionId: row.question_id,
      status: row.status,
      correctCount: row.correct_count,
      wrongCount: row.wrong_count,
      totalResponseTimeMs: row.total_response_time_ms,
      lastResult: row.last_result,
      lastResponseTimeMs: row.last_response_time_ms,
      lastUpdated: row.last_updated ? new Date(row.last_updated) : null,
    })
    progressByProfile[row.profile_id] = list
  }

  const statsByProfile: Record<string, LocalStats> = {}
  for (const row of statsRows) {
    statsByProfile[row.profile_id] = {
      total: row.total,
      correct: row.correct,
      wrong: row.wrong,
    }
  }

  const settingsByProfile: Record<string, LocalSettings> = {}
  for (const row of settingsRows) {
    settingsByProfile[row.profile_id] = {
      autoNext: row.auto_next,
      showNextButton: row.show_next_button,
      allowRepeat: row.allow_repeat,
      questionScope: row.question_scope,
      practiceMode: row.practice_mode,
      selectedCategories: Array.isArray(row.selected_categories) ? row.selected_categories : [],
    }
  }

  return {
    profiles,
    activeProfileId: profiles[0]?.id ?? null,
    progressByProfile,
    statsByProfile,
    settingsByProfile,
  }
}

async function pullCloudSnapshot(userId: string): Promise<LocalSnapshot> {
  const [profiles, progress, stats, settings] = await Promise.all([
    fetchTable<CloudProfileRow>("profiles", userId),
    fetchTable<CloudProgressRow>("question_progress", userId),
    fetchTable<CloudStatsRow>("stats", userId),
    fetchTable<CloudSettingsRow>("settings", userId),
  ])
  return buildSnapshotFromCloud(profiles, progress, stats, settings)
}

async function pushLocalSnapshot(userId: string, snapshot: LocalSnapshot) {
  const now = new Date().toISOString()
  const profileRows: CloudProfileRow[] = snapshot.profiles.map((profile) => ({
    id: profile.id,
    user_id: userId,
    name: profile.name,
    password_hash: profile.password,
    created_at: profile.createdAt,
    last_login_at: profile.lastLoginAt,
  }))

  const progressRows: CloudProgressRow[] = snapshot.profiles.flatMap((profile) =>
    (snapshot.progressByProfile[profile.id] ?? []).map((item) => ({
      user_id: userId,
      profile_id: profile.id,
      question_id: item.questionId,
      status: item.status,
      correct_count: item.correctCount,
      wrong_count: item.wrongCount,
      total_response_time_ms: item.totalResponseTimeMs,
      last_result: item.lastResult,
      last_response_time_ms: item.lastResponseTimeMs,
      last_updated: item.lastUpdated ? item.lastUpdated.toISOString() : null,
    })),
  )

  const statsRows: CloudStatsRow[] = snapshot.profiles.map((profile) => ({
    user_id: userId,
    profile_id: profile.id,
    total: snapshot.statsByProfile[profile.id]?.total ?? 0,
    correct: snapshot.statsByProfile[profile.id]?.correct ?? 0,
    wrong: snapshot.statsByProfile[profile.id]?.wrong ?? 0,
    updated_at: now,
  }))

  const settingsRows: CloudSettingsRow[] = snapshot.profiles.map((profile) => ({
    user_id: userId,
    profile_id: profile.id,
    auto_next: snapshot.settingsByProfile[profile.id]?.autoNext ?? true,
    show_next_button: snapshot.settingsByProfile[profile.id]?.showNextButton ?? true,
    allow_repeat: snapshot.settingsByProfile[profile.id]?.allowRepeat ?? true,
    question_scope: snapshot.settingsByProfile[profile.id]?.questionScope ?? "all",
    practice_mode: snapshot.settingsByProfile[profile.id]?.practiceMode ?? "normal",
    selected_categories: snapshot.settingsByProfile[profile.id]?.selectedCategories ?? [],
    updated_at: now,
  }))

  await Promise.all([
    upsertRows("profiles", profileRows, "id"),
    upsertRows("question_progress", progressRows, "user_id,profile_id,question_id"),
    upsertRows("stats", statsRows, "user_id,profile_id"),
    upsertRows("settings", settingsRows, "user_id,profile_id"),
  ])
}

export function notifyLocalDataChanged() {
  window.dispatchEvent(new CustomEvent(CLOUD_SYNC_EVENT))
}

export function isCloudSyncEnabled() {
  return isSupabaseConfigured()
}

export function getCloudSyncDebugStatus(): CloudSyncDebugStatus {
  return {
    enabled: isSupabaseConfigured(),
    hasUrl: SUPABASE_URL.length > 0,
    hasAnonKey: SUPABASE_ANON_KEY.length > 0,
    hasAuthSession: !!getSupabaseAuthSession(),
  }
}

function resolveCloudUserId() {
  return getSupabaseAuthUserId() ?? getOrCreateCloudUserId()
}

export async function reconcileCloudWithLocal() {
  if (!isSupabaseConfigured()) {
    logCloudConfigWarning()
    return
  }
  const userId = resolveCloudUserId()

  const localSnapshot = readLocalSnapshot()
  const cloudSnapshot = await pullCloudSnapshot(userId)
  const hasCloudData =
    cloudSnapshot.profiles.length > 0 ||
    Object.keys(cloudSnapshot.progressByProfile).length > 0 ||
    Object.keys(cloudSnapshot.statsByProfile).length > 0 ||
    Object.keys(cloudSnapshot.settingsByProfile).length > 0

  if (hasCloudData) {
    const activeProfileId = localSnapshot.activeProfileId
    writeLocalSnapshot({
      ...cloudSnapshot,
      activeProfileId:
        activeProfileId && cloudSnapshot.profiles.some((profile) => profile.id === activeProfileId)
          ? activeProfileId
          : cloudSnapshot.activeProfileId,
    })
    return
  }

  await pushLocalSnapshot(userId, localSnapshot)
}

export async function pushCurrentLocalStateToCloud() {
  if (!isSupabaseConfigured()) return
  const userId = resolveCloudUserId()
  await pushLocalSnapshot(userId, readLocalSnapshot())
}

export function bindCloudAutoSync() {
  if (!isSupabaseConfigured()) {
    logCloudConfigWarning()
    return () => undefined
  }

  let pending = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const schedulePush = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(async () => {
      if (pending) return
      pending = true
      try {
        await pushCurrentLocalStateToCloud()
      } catch (error) {
        // Keep local-first behavior when cloud sync fails while exposing diagnostics.
        console.warn("[cloud-sync] push failed", error)
      } finally {
        pending = false
      }
    }, 1200)
  }

  const onChange = () => {
    schedulePush()
  }

  const onBeforeUnload = () => {
    void pushCurrentLocalStateToCloud()
  }

  window.addEventListener(CLOUD_SYNC_EVENT, onChange)
  window.addEventListener("beforeunload", onBeforeUnload)
  const intervalId = window.setInterval(() => {
    schedulePush()
  }, 15000)

  return () => {
    if (timer) clearTimeout(timer)
    window.clearInterval(intervalId)
    window.removeEventListener(CLOUD_SYNC_EVENT, onChange)
    window.removeEventListener("beforeunload", onBeforeUnload)
  }
}