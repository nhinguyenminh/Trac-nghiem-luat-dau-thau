import { useCallback, useEffect, useState } from "react"
import type { QuestionScope } from "./types"

export interface Settings {
  autoNext: boolean
  showNextButton: boolean
  allowRepeat: boolean
  questionScope: QuestionScope
}

const STORAGE_KEY = "quiz-settings-v1"

const defaultSettings: Settings = {
  autoNext: true,
  showNextButton: true,
  allowRepeat: true,
  questionScope: "all",
}

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      autoNext: typeof parsed.autoNext === "boolean" ? parsed.autoNext : defaultSettings.autoNext,
      showNextButton: typeof parsed.showNextButton === "boolean" ? parsed.showNextButton : defaultSettings.showNextButton,
      allowRepeat: typeof parsed.allowRepeat === "boolean" ? parsed.allowRepeat : defaultSettings.allowRepeat,
      questionScope:
        parsed.questionScope === "first200" || parsed.questionScope === "after200"
          ? parsed.questionScope
          : defaultSettings.questionScope,
    }
  } catch {
    return defaultSettings
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setSettings(readSettings())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings, loaded])

  const toggle = useCallback((key: keyof Settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const setValue = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  return { settings, toggle, setValue }
}
