import type { Question } from "../types"

/**
 * Compute a 0–100 score for a completed exam session.
 * Returns 0 if no questions were given.
 */
export function computeScore(
  examQuestions: Question[],
  selectedAnswers: Record<number, number | null>,
): number {
  if (examQuestions.length === 0) return 0
  const correctCount = examQuestions.reduce((count, q) => {
    return count + (selectedAnswers[q.id] === q.answer ? 1 : 0)
  }, 0)
  return Math.round((correctCount / examQuestions.length) * 100)
}
