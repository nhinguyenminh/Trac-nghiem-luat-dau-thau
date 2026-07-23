import { useCallback, useEffect, useState } from "react"
import type { QuestionScope } from "./types"

export interface Settings {
  autoNext: boolean
  showNextButton: boolean
  allowRepeat: boolean
  questionScope: QuestionScope
  selectedCategories: string[]
}

const STORAGE_KEY = "quiz-settings-v1"

const defaultSettings: Settings = {
  autoNext: true,
  showNextButton: true,
  allowRepeat: true,
  questionScope: "all",
  selectedCategories: [],
}

function getStorageKey(profileId: string) {
  return `${STORAGE_KEY}:${profileId}`
}

function readSettings(profileId: string | null): Settings {
  if (!profileId) return defaultSettings
  try {
    const raw = localStorage.getItem(getStorageKey(profileId))
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<Settings>
    const selectedCategories = Array.isArray(parsed.selectedCategories)
      ? parsed.selectedCategories.filter((value): value is string => typeof value === "string")
      : []

    return {
      autoNext: typeof parsed.autoNext === "boolean" ? parsed.autoNext : defaultSettings.autoNext,
      showNextButton: typeof parsed.showNextButton === "boolean" ? parsed.showNextButton : defaultSettings.showNextButton,
      allowRepeat: typeof parsed.allowRepeat === "boolean" ? parsed.allowRepeat : defaultSettings.allowRepeat,
      questionScope:
        parsed.questionScope === "first200" || parsed.questionScope === "after200" || parsed.questionScope === "supplement50"
          ? parsed.questionScope
          : defaultSettings.questionScope,
      selectedCategories,
    }
  } catch {
    return defaultSettings
  }
}

export function useSettings(profileId: string | null) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSettings(readSettings(profileId))
    setLoaded(true)
  }, [profileId])

  useEffect(() => {
    if (!loaded) return
    if (!profileId) return
    localStorage.setItem(getStorageKey(profileId), JSON.stringify(settings))
  }, [settings, loaded, profileId])

  const toggle = useCallback((key: keyof Settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const setValue = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleCategory = useCallback((category: string) => {
    setSettings((prev) => {
      const nextCategories = prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter((value) => value !== category)
        : [...prev.selectedCategories, category]

      return { ...prev, selectedCategories: nextCategories }
    })
  }, [])

  return { settings, toggle, setValue, toggleCategory }
}
