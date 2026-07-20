import { useCallback, useEffect, useState } from "react"

export interface Settings {
  autoNext: boolean
  showNextButton: boolean
  allowRepeat: boolean
}

const STORAGE_KEY = "quiz-settings-v1"

const defaultSettings: Settings = { autoNext: true, showNextButton: true, allowRepeat: true }

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      autoNext: typeof parsed.autoNext === "boolean" ? parsed.autoNext : defaultSettings.autoNext,
      showNextButton: typeof parsed.showNextButton === "boolean" ? parsed.showNextButton : defaultSettings.showNextButton,
      allowRepeat: typeof parsed.allowRepeat === "boolean" ? parsed.allowRepeat : defaultSettings.allowRepeat,
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

  return { settings, toggle }
}
