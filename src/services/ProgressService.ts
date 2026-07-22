import type { QuestionProgress } from "../types"

const STORAGE_KEY = "quiz-progress-v1"

type StoredQuestionProgress = Omit<QuestionProgress, "lastUpdated"> & {
  lastUpdated: string | null
}

function normalizeProgressItem(item: unknown): QuestionProgress | null {
  if (typeof item !== "object" || item === null) return null
  const candidate = item as Record<string, unknown>
  const questionId = Number(candidate.questionId)
  const status = candidate.status
  const correctCount = Number(candidate.correctCount)
  const wrongCount = Number(candidate.wrongCount)
  const lastResult = candidate.lastResult
  const lastUpdatedRaw = candidate.lastUpdated

  if (!Number.isInteger(questionId) || questionId <= 0) return null
  if (status !== "unseen" && status !== "correct" && status !== "wrong") return null
  if (!Number.isInteger(correctCount) || correctCount < 0) return null
  if (!Number.isInteger(wrongCount) || wrongCount < 0) return null
  if (lastResult !== "correct" && lastResult !== "wrong" && lastResult !== null) return null
  if (lastUpdatedRaw !== null && typeof lastUpdatedRaw !== "string") return null

  return {
    questionId,
    status,
    correctCount,
    wrongCount,
    lastResult: lastResult as QuestionProgress["lastResult"],
    lastUpdated: lastUpdatedRaw ? new Date(lastUpdatedRaw) : null,
  }
}

export function readProgress(): QuestionProgress[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => normalizeProgressItem(item))
      .filter((item): item is QuestionProgress => item !== null)
  } catch {
    return []
  }
}

export function writeProgress(progress: QuestionProgress[]) {
  const stored: StoredQuestionProgress[] = progress.map((item) => ({
    questionId: item.questionId,
    status: item.status,
    correctCount: item.correctCount,
    wrongCount: item.wrongCount,
    lastResult: item.lastResult,
    lastUpdated: item.lastUpdated ? item.lastUpdated.toISOString() : null,
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function getQuestionProgress(progress: QuestionProgress[], questionId: number): QuestionProgress {
  const existing = progress.find((item) => item.questionId === questionId)
  if (existing) return existing
  return {
    questionId,
    status: "unseen",
    correctCount: 0,
    wrongCount: 0,
    lastResult: null,
    lastUpdated: null,
  }
}

export function updateQuestionProgress(
  progress: QuestionProgress[],
  questionId: number,
  isCorrect: boolean,
): QuestionProgress[] {
  const existing = getQuestionProgress(progress, questionId)
  const next: QuestionProgress = {
    questionId,
    status: isCorrect ? "correct" : "wrong",
    correctCount: existing.correctCount + (isCorrect ? 1 : 0),
    wrongCount: existing.wrongCount + (isCorrect ? 0 : 1),
    lastResult: isCorrect ? "correct" : "wrong",
    lastUpdated: new Date(),
  }

  return progress.some((item) => item.questionId === questionId)
    ? progress.map((item) => (item.questionId === questionId ? next : item))
    : [...progress, next]
}

export function resetProgress(): QuestionProgress[] {
  const cleared: QuestionProgress[] = []
  writeProgress(cleared)
  return cleared
}
