import type { Question } from "../types"
import type { ScopeOption } from "../config/subject"

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeText(value: string): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()
}

// ---------------------------------------------------------------------------
// Option shuffling
// ---------------------------------------------------------------------------

/**
 * Detect whether an option shuffle would change the meaning of the question.
 * Returns true when it is safe to shuffle options.
 *
 * The detection relies on Vietnamese linguistic patterns that reference
 * option order (e.g. "tất cả phương án", "phương án trên").
 */
export function shouldShuffleOptions(question: Question): boolean {
  const text = normalizeText(`${question.question} ${question.options.join(" ")}`)
  const answerText = normalizeText(question.options[question.answer] ?? "")
  const haystack = `${text} ${answerText}`

  const shouldKeepOriginalOrder =
    /đều\s+(đúng|sai)/.test(haystack) ||
    /là\s+(đúng|sai)/.test(haystack) ||
    /\b(đáp\s+án|phương\s+án|các\s+phương\s+án|tất\s+cả\s+phương\s+án|tất\s+cả\s+các\s+phương\s+án)\b[^\n]*\b(và|,|\/)\b/.test(
      haystack,
    ) ||
    /tất\s+cả\s+(các\s+)?phương\s+án/.test(haystack) ||
    /mọi\s+phương\s+án/.test(haystack) ||
    /phương\s+án\s+trên/.test(haystack) ||
    /cả\s+\d+\s+phương\s+án/.test(haystack)

  return !shouldKeepOriginalOrder
}

// ---------------------------------------------------------------------------
// Array / question shuffling
// ---------------------------------------------------------------------------

/** Fisher-Yates shuffle — returns a new array */
export function shuffleArray<T>(source: T[]): T[] {
  const arr = [...source]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Return a new Question with its options randomly reordered (when safe).
 * The `answer` index is updated to reflect the new option order.
 * The original option positions are stored in `optionOrder`.
 */
export function shuffleQuestion(question: Question): Question {
  if (!shouldShuffleOptions(question)) {
    return {
      ...question,
      answer: question.answer,
      optionOrder: [...Array(question.options.length).keys()],
    }
  }

  const optionOrder = [...Array(question.options.length).keys()]
  for (let i = optionOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[optionOrder[i], optionOrder[j]] = [optionOrder[j], optionOrder[i]]
  }

  return {
    ...question,
    options: optionOrder.map((index) => question.options[index]),
    answer: optionOrder.indexOf(question.answer),
    optionOrder,
  }
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

/** Return a sorted, deduplicated list of all non-empty categories. */
export function getQuestionCategories(questions: Question[]): string[] {
  return Array.from(
    new Set(questions.map((q) => (q.category ?? "").trim()).filter(Boolean)),
  ).sort()
}

// ---------------------------------------------------------------------------
// Scope / category filtering
// ---------------------------------------------------------------------------

/**
 * Filter questions by scope using the ScopeOption definitions from the subject config.
 * Falls back to returning all sorted questions if the scope value is not found.
 */
export function getQuestionsForScope(
  questions: Question[],
  scope: string,
  scopes: ScopeOption[],
): Question[] {
  const sorted = [...questions].sort((a, b) => a.id - b.id)
  const scopeOption = scopes.find((s) => s.value === scope)
  return scopeOption ? scopeOption.filter(sorted) : sorted
}

/** Filter questions to only those belonging to the selected categories. */
export function getQuestionsForCategories(
  questions: Question[],
  selectedCategories: string[],
): Question[] {
  if (selectedCategories.length === 0) return questions
  return questions.filter((q) => {
    const category = (q.category ?? "").trim()
    return selectedCategories.includes(category)
  })
}

/**
 * Apply both scope and category filters in sequence.
 * This is the primary entry point used by QuizPage.
 */
export function getFilteredQuestions(
  questions: Question[],
  scope: string,
  selectedCategories: string[],
  scopes: ScopeOption[],
): Question[] {
  const scopedQuestions = getQuestionsForScope(questions, scope, scopes)
  return getQuestionsForCategories(scopedQuestions, selectedCategories)
}
