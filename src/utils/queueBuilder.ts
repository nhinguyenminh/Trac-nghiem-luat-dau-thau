import type { PracticeMode, Question, QuestionProgress } from "../types"
import { shuffleArray } from "./questionUtils"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getQuestionAttemptCount(progress: QuestionProgress | undefined): number {
  if (!progress) return 0
  return progress.correctCount + progress.wrongCount
}

function getQuestionLastUpdatedTime(progress: QuestionProgress | undefined): number {
  return progress?.lastUpdated?.getTime() ?? 0
}

/**
 * Ensure the first question in the queue is different from the previous question
 * to avoid showing the same question twice in a row.
 */
function ensureFirstQuestionNotRepeated(
  queue: Question[],
  previousQuestionId?: number,
): Question[] {
  if (previousQuestionId == null || queue.length <= 1) return queue

  const firstDifferentIndex = queue.findIndex((q) => q.id !== previousQuestionId)
  if (firstDifferentIndex <= 0) return queue

  const [firstDifferent] = queue.splice(firstDifferentIndex, 1)
  queue.unshift(firstDifferent)
  return queue
}

/**
 * Merge multiple priority buckets by cycling through them in the given pick order.
 * Example: pickOrder=[0,1,0,2] means: bucket0, bucket1, bucket0, bucket2, repeat.
 */
function interleavePriorityBuckets(
  priorityBuckets: Question[][],
  pickOrder: number[],
): Question[] {
  const queues = priorityBuckets.map((bucket) => [...bucket])
  const merged: Question[] = []

  while (queues.some((bucket) => bucket.length > 0)) {
    let addedInCycle = false

    for (const bucketIndex of pickOrder) {
      const nextQuestion = queues[bucketIndex]?.shift()
      if (!nextQuestion) continue
      merged.push(nextQuestion)
      addedInCycle = true
    }

    if (!addedInCycle) break
  }

  return merged
}

// ---------------------------------------------------------------------------
// Queue builders
// ---------------------------------------------------------------------------

function buildNormalQuestionQueue(
  sourceQuestions: Question[],
  previousQuestionId?: number,
): Question[] {
  const queue = shuffleArray(sourceQuestions)
  return ensureFirstQuestionNotRepeated(queue, previousQuestionId)
}

function buildFocusQuestionQueue(
  sourceQuestions: Question[],
  progressMap: Map<number, QuestionProgress>,
  previousQuestionId?: number,
): Question[] {
  const wrongQuestions: Question[] = []
  const unseenQuestions: Question[] = []
  const reviewedQuestions: Question[] = []

  for (const question of sourceQuestions) {
    const questionProgress = progressMap.get(question.id)
    const attempts = getQuestionAttemptCount(questionProgress)

    if (questionProgress?.status === "wrong") {
      wrongQuestions.push(question)
      continue
    }

    if (attempts === 0) {
      unseenQuestions.push(question)
      continue
    }

    reviewedQuestions.push(question)
  }

  const staleQuestions = [...reviewedQuestions].sort((a, b) => {
    const lastUpdatedDiff =
      getQuestionLastUpdatedTime(progressMap.get(a.id)) -
      getQuestionLastUpdatedTime(progressMap.get(b.id))
    if (lastUpdatedDiff !== 0) return lastUpdatedDiff

    const aAttempts = getQuestionAttemptCount(progressMap.get(a.id))
    const bAttempts = getQuestionAttemptCount(progressMap.get(b.id))
    if (aAttempts !== bAttempts) return aAttempts - bAttempts

    return Math.random() - 0.5
  })

  const queue = interleavePriorityBuckets(
    [shuffleArray(wrongQuestions), shuffleArray(unseenQuestions), staleQuestions],
    [0, 1, 0, 2],
  )

  return ensureFirstQuestionNotRepeated(queue, previousQuestionId)
}

/**
 * Build a question queue according to the current practice mode.
 *
 * - "normal"            — random shuffle
 * - "focusWrongAndStale" — prioritises wrong answers, then unseen, then stale
 */
export function buildQuestionQueue(
  sourceQuestions: Question[],
  progressMap: Map<number, QuestionProgress>,
  practiceMode: PracticeMode,
  previousQuestionId?: number,
): Question[] {
  if (practiceMode === "normal") {
    return buildNormalQuestionQueue(sourceQuestions, previousQuestionId)
  }

  return buildFocusQuestionQueue(sourceQuestions, progressMap, previousQuestionId)
}
