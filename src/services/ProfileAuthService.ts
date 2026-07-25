import type { UserProfile } from "../types"
import { notifyLocalDataChanged } from "./CloudSyncService"

const PROFILES_KEY = "quiz-profiles-v1"
const ACTIVE_PROFILE_KEY = "quiz-active-profile-v1"

interface StoredProfiles {
  profiles: UserProfile[]
}

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

function readStoredProfiles(): StoredProfiles {
  try {
    const raw = localStorage.getItem(PROFILES_KEY)
    if (!raw) {
      return { profiles: [] }
    }
    const parsed = JSON.parse(raw) as Partial<StoredProfiles>
    const profiles = Array.isArray(parsed.profiles) ? parsed.profiles.filter(isUserProfile) : []
    return { profiles }
  } catch {
    return { profiles: [] }
  }
}

function writeStoredProfiles(profiles: UserProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify({ profiles }))
  notifyLocalDataChanged()
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
    notifyLocalDataChanged()
    return
  }

  localStorage.removeItem(ACTIVE_PROFILE_KEY)
  notifyLocalDataChanged()
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

export function loginProfileByName(name: string, password: string): UserProfile | null {
  const normalizedName = name.trim().toLowerCase()
  const normalizedPassword = password.trim()
  if (!normalizedName || !normalizedPassword) return null

  const profiles = readProfiles()
  const current = profiles.find((profile) => profile.name.trim().toLowerCase() === normalizedName)
  if (!current) return null
  if (current.password !== normalizedPassword) return null

  const updated: UserProfile = {
    ...current,
    lastLoginAt: new Date().toISOString(),
  }

  const nextProfiles = profiles.map((profile) => (profile.id === updated.id ? updated : profile))
  writeStoredProfiles(nextProfiles)
  writeActiveProfileId(updated.id)
  return updated
}

export function logoutProfile() {
  writeActiveProfileId(null)
}

export function resetProfilePasswordByName(name: string, newPassword: string): UserProfile {
  const normalizedName = name.trim().toLowerCase()
  const normalizedPassword = newPassword.trim()
  if (!normalizedName) {
    throw new Error("Tên đăng nhập không được để trống")
  }
  if (!normalizedPassword) {
    throw new Error("Mật khẩu mới không được để trống")
  }

  const profiles = readProfiles()
  const current = profiles.find((profile) => profile.name.trim().toLowerCase() === normalizedName)
  if (!current) {
    throw new Error("Tên đăng nhập không tồn tại")
  }

  const updated: UserProfile = {
    ...current,
    password: normalizedPassword,
    lastLoginAt: new Date().toISOString(),
  }

  const nextProfiles = profiles.map((profile) => (profile.id === updated.id ? updated : profile))
  writeStoredProfiles(nextProfiles)
  return updated
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
