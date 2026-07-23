import type { QuestionProgress } from "../types"

const STORAGE_KEY = "quiz-progress-v2"

function getStorageKey(profileId: string) {
  return `${STORAGE_KEY}:${profileId}`
}

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
  const totalResponseTimeMsRaw = candidate.totalResponseTimeMs
  const totalResponseTimeMs =
    totalResponseTimeMsRaw == null ? 0 : Number(totalResponseTimeMsRaw)
  const lastResult = candidate.lastResult
  const lastResponseTimeMsRaw = candidate.lastResponseTimeMs
  const lastUpdatedRaw = candidate.lastUpdated

  if (!Number.isInteger(questionId) || questionId <= 0) return null
  if (status !== "unseen" && status !== "correct" && status !== "wrong") return null
  if (!Number.isInteger(correctCount) || correctCount < 0) return null
  if (!Number.isInteger(wrongCount) || wrongCount < 0) return null
  if (!Number.isFinite(totalResponseTimeMs) || totalResponseTimeMs < 0) return null
  if (lastResult !== "correct" && lastResult !== "wrong" && lastResult !== null) return null
  if (
    lastResponseTimeMsRaw != null &&
    (!Number.isFinite(Number(lastResponseTimeMsRaw)) || Number(lastResponseTimeMsRaw) < 0)
  ) {
    return null
  }
  if (lastUpdatedRaw !== null && typeof lastUpdatedRaw !== "string") return null

  return {
    questionId,
    status,
    correctCount,
    wrongCount,
    totalResponseTimeMs,
    lastResult: lastResult as QuestionProgress["lastResult"],
    lastResponseTimeMs: lastResponseTimeMsRaw === null ? null : Number(lastResponseTimeMsRaw),
    lastUpdated: lastUpdatedRaw ? new Date(lastUpdatedRaw) : null,
  }
}

export function readProgress(profileId: string | null): QuestionProgress[] {
  if (!profileId) return []
  try {
    const raw = localStorage.getItem(getStorageKey(profileId))
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

export function writeProgress(profileId: string | null, progress: QuestionProgress[]) {
  if (!profileId) return
  const stored: StoredQuestionProgress[] = progress.map((item) => ({
    questionId: item.questionId,
    status: item.status,
    correctCount: item.correctCount,
    wrongCount: item.wrongCount,
    totalResponseTimeMs: item.totalResponseTimeMs,
    lastResult: item.lastResult,
    lastResponseTimeMs: item.lastResponseTimeMs,
    lastUpdated: item.lastUpdated ? item.lastUpdated.toISOString() : null,
  }))
  localStorage.setItem(getStorageKey(profileId), JSON.stringify(stored))
}

export function getQuestionProgress(progress: QuestionProgress[], questionId: number): QuestionProgress {
  const existing = progress.find((item) => item.questionId === questionId)
  if (existing) return existing
  return {
    questionId,
    status: "unseen",
    correctCount: 0,
    wrongCount: 0,
    totalResponseTimeMs: 0,
    lastResult: null,
    lastResponseTimeMs: null,
    lastUpdated: null,
  }
}

export function updateQuestionProgress(
  progress: QuestionProgress[],
  questionId: number,
  isCorrect: boolean,
  responseTimeMs: number,
): QuestionProgress[] {
  const existing = getQuestionProgress(progress, questionId)
  const normalizedResponseTimeMs = Number.isFinite(responseTimeMs) && responseTimeMs >= 0 ? Math.round(responseTimeMs) : 0
  const next: QuestionProgress = {
    questionId,
    status: isCorrect ? "correct" : "wrong",
    correctCount: existing.correctCount + (isCorrect ? 1 : 0),
    wrongCount: existing.wrongCount + (isCorrect ? 0 : 1),
    totalResponseTimeMs: existing.totalResponseTimeMs + normalizedResponseTimeMs,
    lastResult: isCorrect ? "correct" : "wrong",
    lastResponseTimeMs: normalizedResponseTimeMs,
    lastUpdated: new Date(),
  }

  return progress.some((item) => item.questionId === questionId)
    ? progress.map((item) => (item.questionId === questionId ? next : item))
    : [...progress, next]
}

export function resetProgress(profileId: string | null): QuestionProgress[] {
  const cleared: QuestionProgress[] = []
  writeProgress(profileId, cleared)
  return cleared
}
