export type QuestionScope = "all" | "first200" | "after200"

export interface Question {
  id: number
  category?: string
  question: string
  options: string[]
  answer: number
  optionOrder?: number[]
}

export interface Stats {
  total: number
  correct: number
  wrong: number
}
