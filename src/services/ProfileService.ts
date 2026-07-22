import type { Question, QuestionProgress } from "../types"
import { getQuestionProgress } from "./ProgressService"

export function buildProgressMap(progress: QuestionProgress[]) {
  return progress.reduce<Record<number, QuestionProgress>>((map, item) => {
    map[item.questionId] = item
    return map
  }, {})
}

export function getQuestionStatus(progress: QuestionProgress[], questionId: number) {
  return getQuestionProgress(progress, questionId).status
}

export function getProgressSummary(questions: Question[], progress: QuestionProgress[]) {
  const map = buildProgressMap(progress)
  let unseen = 0
  let correct = 0
  let wrong = 0

  for (const question of questions) {
    const status = map[question.id]?.status ?? "unseen"
    if (status === "correct") correct += 1
    else if (status === "wrong") wrong += 1
    else unseen += 1
  }

  return { unseen, correct, wrong }
}
