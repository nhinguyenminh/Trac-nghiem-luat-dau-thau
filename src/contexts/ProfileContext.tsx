import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import type { UserProfile } from "../types"
import { bindCloudAutoSync, isCloudSyncEnabled, reconcileCloudWithLocal } from "../services/CloudSyncService"
import {
  createProfile as createProfileRecord,
  deleteProfile as deleteProfileRecord,
  loginProfileByName as loginProfileRecord,
  resetProfilePasswordByName as resetProfilePasswordRecord,
  logoutProfile as logoutProfileRecord,
  readActiveProfileId,
  readProfiles,
} from "../services/ProfileAuthService"

const PROFILE_STORAGE_PREFIXES = [
  "quiz-progress-v2",
  "quiz-stats-v1",
  "quiz-attempts-v1",
  "quiz-settings-v1",
]

interface ProfileContextValue {
  profiles: UserProfile[]
  activeProfile: UserProfile | null
  createProfile: (name: string, password: string) => { ok: boolean; error?: string }
  login: (name: string, password: string) => { ok: boolean; error?: string }
  resetPassword: (name: string, newPassword: string) => { ok: boolean; error?: string }
  logout: () => void
  deleteProfile: (profileId: string) => void
  resetAllData: (profileId: string) => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

function clearProfileData(profileId: string) {
  for (const prefix of PROFILE_STORAGE_PREFIXES) {
    localStorage.removeItem(`${prefix}:${profileId}`)
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => readProfiles())
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => readActiveProfileId())

  useEffect(() => {
    if (!isCloudSyncEnabled()) return

    let disposed = false
    const unbind = bindCloudAutoSync()
    void reconcileCloudWithLocal()
      .catch((error) => {
        console.warn("[cloud-sync] reconcile failed", error)
      })
      .then(() => {
        if (disposed) return
        setProfiles(readProfiles())
        setActiveProfileId(readActiveProfileId())
      })

    return () => {
      disposed = true
      unbind()
    }
  }, [])

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [activeProfileId, profiles],
  )

  const createProfile = useCallback((name: string, password: string) => {
    try {
      const created = createProfileRecord(name, password)
      const nextProfiles = readProfiles()
      setProfiles(nextProfiles)
      setActiveProfileId(created.id)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Không thể tạo profile",
      }
    }
  }, [])

  const login = useCallback((name: string, password: string) => {
    const loggedInProfile = loginProfileRecord(name, password)
    if (!loggedInProfile) {
      return { ok: false, error: "Sai tên đăng nhập hoặc mật khẩu" }
    }

    setProfiles(readProfiles())
    setActiveProfileId(loggedInProfile.id)
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    logoutProfileRecord()
    setActiveProfileId(null)
  }, [])

  const resetPassword = useCallback((name: string, newPassword: string) => {
    try {
      resetProfilePasswordRecord(name, newPassword)
      setProfiles(readProfiles())
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Không thể đặt lại mật khẩu",
      }
    }
  }, [])

  const deleteProfile = useCallback((profileId: string) => {
    clearProfileData(profileId)
    const nextProfiles = deleteProfileRecord(profileId)
    setProfiles(nextProfiles)
    setActiveProfileId((currentId) => (currentId === profileId ? null : currentId))
  }, [])

  const resetAllData = useCallback((profileId: string) => {
    clearProfileData(profileId)
  }, [])

  const value = useMemo(
    () => ({
      profiles,
      activeProfile,
      createProfile,
      login,
      resetPassword,
      logout,
      deleteProfile,
      resetAllData,
    }),
    [profiles, activeProfile, createProfile, login, resetPassword, logout, deleteProfile, resetAllData],
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider")
  }

  return context
}
