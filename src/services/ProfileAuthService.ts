import type { UserProfile } from "../types"

const PROFILES_KEY = "quiz-profiles-v1"
const ACTIVE_PROFILE_KEY = "quiz-active-profile-v1"

interface StoredProfiles {
  profiles: UserProfile[]
}

const DEFAULT_PROFILE_NAME = "Hung"
const DEFAULT_PROFILE_PASSWORD = "aabaab"

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === "string" &&
    candidate.id.trim().length > 0 &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.password === "string" &&
    candidate.password.length > 0 &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.lastLoginAt === "string"
  )
}

function ensureDefaultProfile(profiles: UserProfile[]): UserProfile[] {
  const existing = profiles.find((profile) => profile.name.toLowerCase() === DEFAULT_PROFILE_NAME.toLowerCase())
  if (existing) return profiles

  const now = new Date().toISOString()
  return [
    ...profiles,
    {
      id: "seed-hung-profile",
      name: DEFAULT_PROFILE_NAME,
      password: DEFAULT_PROFILE_PASSWORD,
      createdAt: now,
      lastLoginAt: now,
    },
  ]
}

function readStoredProfiles(): StoredProfiles {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) {
      const seeded = ensureDefaultProfile([])
      writeStoredProfiles(seeded)
      return { profiles: seeded }
    }
    const parsed = JSON.parse(raw) as Partial<StoredProfiles>
    const profiles = Array.isArray(parsed.profiles) ? parsed.profiles.filter(isUserProfile) : []
    const seeded = ensureDefaultProfile(profiles)
    if (seeded.length !== profiles.length) {
      writeStoredProfiles(seeded)
    }
    return { profiles: seeded }
  } catch {
    const seeded = ensureDefaultProfile([])
    writeStoredProfiles(seeded)
    return { profiles: seeded }
  }
}

function writeStoredProfiles(profiles: UserProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify({ profiles }))
}

function generateProfileId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function readProfiles(): UserProfile[] {
  return readStoredProfiles().profiles
}

export function readActiveProfileId(): string | null {
  const raw = localStorage.getItem(ACTIVE_PROFILE_KEY)
  return typeof raw === "string" && raw.trim().length > 0 ? raw : null
}

export function writeActiveProfileId(profileId: string | null) {
  if (profileId) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profileId)
    return
  }

  localStorage.removeItem(ACTIVE_PROFILE_KEY)
}

export function createProfile(name: string, password: string): UserProfile {
  const normalizedName = name.trim()
  const normalizedPassword = password.trim()
  if (!normalizedName) {
    throw new Error("Tên profile không được để trống")
  }
  if (!normalizedPassword) {
    throw new Error("Mật khẩu không được để trống")
  }

  const profiles = readProfiles()
  const duplicate = profiles.find((profile) => profile.name.toLowerCase() === normalizedName.toLowerCase())
  if (duplicate) {
    throw new Error("Tên profile đã tồn tại")
  }

  const now = new Date().toISOString()
  const nextProfile: UserProfile = {
    id: generateProfileId(),
    name: normalizedName,
    password: normalizedPassword,
    createdAt: now,
    lastLoginAt: now,
  }

  writeStoredProfiles([...profiles, nextProfile])
  writeActiveProfileId(nextProfile.id)
  return nextProfile
}

export function loginProfile(profileId: string, password: string): UserProfile | null {
  const profiles = readProfiles()
  const current = profiles.find((profile) => profile.id === profileId)
  if (!current) return null
  if (current.password !== password) return null

  const updated: UserProfile = {
    ...current,
    lastLoginAt: new Date().toISOString(),
  }

  const nextProfiles = profiles.map((profile) => (profile.id === profileId ? updated : profile))
  writeStoredProfiles(nextProfiles)
  writeActiveProfileId(profileId)
  return updated
}

export function logoutProfile() {
  writeActiveProfileId(null)
}

export function deleteProfile(profileId: string): UserProfile[] {
  const profiles = readProfiles()
  const nextProfiles = profiles.filter((profile) => profile.id !== profileId)
  writeStoredProfiles(nextProfiles)

  if (readActiveProfileId() === profileId) {
    writeActiveProfileId(null)
  }

  return nextProfiles
}
