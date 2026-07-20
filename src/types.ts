export interface Question {
  id: number
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
