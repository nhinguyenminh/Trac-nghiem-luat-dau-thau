import { useCallback, useEffect, useState } from "react"
import type { Stats } from "./types"

const STORAGE_KEY = "quiz-stats-v1"
export const ATTEMPTS_KEY = "quiz-attempts-v1"

const emptyStats: Stats = { total: 0, correct: 0, wrong: 0 }

function resetSessionStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyStats))
  localStorage.removeItem(ATTEMPTS_KEY)
}

export function useStats() {
  const [stats, setStats] = useState<Stats>(emptyStats)

  useEffect(() => {
    resetSessionStorage()
    setStats(emptyStats)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats))
  }, [stats])

  const record = useCallback((isCorrect: boolean) => {
    setStats((prev) => ({
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      wrong: prev.wrong + (isCorrect ? 0 : 1),
    }))
  }, [])

  const reset = useCallback(() => {
    resetSessionStorage()
    setStats(emptyStats)
  }, [])

  const accuracy = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100)

  return { stats, accuracy, record, reset }
}
