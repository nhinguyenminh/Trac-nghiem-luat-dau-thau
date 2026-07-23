import { useCallback, useEffect, useState } from "react"
import type { Stats } from "./types"

const STORAGE_KEY = "quiz-stats-v1"
export const ATTEMPTS_KEY = "quiz-attempts-v1"

const emptyStats: Stats = { total: 0, correct: 0, wrong: 0 }

function getStatsKey(profileId: string) {
  return `${STORAGE_KEY}:${profileId}`
}

export function getAttemptsStorageKey(profileId: string) {
  return `${ATTEMPTS_KEY}:${profileId}`
}

function readStoredStats(profileId: string | null): Stats {
  if (!profileId) return emptyStats
  try {
    const raw = localStorage.getItem(getStatsKey(profileId))
    if (!raw) return emptyStats
    const parsed = JSON.parse(raw) as Partial<Stats>
    const total = typeof parsed.total === "number" && Number.isInteger(parsed.total) && parsed.total >= 0 ? parsed.total : 0
    const correct =
      typeof parsed.correct === "number" && Number.isInteger(parsed.correct) && parsed.correct >= 0 ? parsed.correct : 0
    const wrong = typeof parsed.wrong === "number" && Number.isInteger(parsed.wrong) && parsed.wrong >= 0 ? parsed.wrong : 0

    return { total, correct, wrong }
  } catch {
    return emptyStats
  }
}

export function useStats(profileId: string | null) {
  const [stats, setStats] = useState<Stats>(emptyStats)

  useEffect(() => {
    setStats(readStoredStats(profileId))
  }, [profileId])

  useEffect(() => {
    if (!profileId) return
    localStorage.setItem(getStatsKey(profileId), JSON.stringify(stats))
  }, [profileId, stats])

  const record = useCallback((isCorrect: boolean) => {
    setStats((prev) => ({
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
    }))
  }, [])

  const reset = useCallback(() => {
    if (profileId) {
      localStorage.setItem(getStatsKey(profileId), JSON.stringify(emptyStats))
      localStorage.removeItem(getAttemptsStorageKey(profileId))
    }
    setStats(emptyStats)
  }, [profileId])

  const accuracy = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100)

  return { stats, accuracy, record, reset }
}
