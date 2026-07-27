/** Scope value — valid values are defined in src/config/subject.ts */
export type QuestionScope = string

export type PracticeMode = "normal" | "focusWrongAndStale"

export interface Question {
  id: number
  category?: string
  question: string
  options: string[]
  answer: number
  optionOrder?: number[]
}

export type QuestionProgressStatus = "unseen" | "correct" | "wrong"

export interface QuestionProgress {
  questionId: number
  status: QuestionProgressStatus
  correctCount: number
  wrongCount: number
  totalResponseTimeMs: number
  lastResult: "correct" | "wrong" | null
  lastResponseTimeMs: number | null
  lastUpdated: Date | null
}

export interface UserProfile {
  id: string
  name: string
  password: string
  createdAt: string
  lastLoginAt: string
}

export interface Stats {
  total: number
  correct: number
  wrong: number
}
