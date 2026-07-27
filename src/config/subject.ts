/**
 * Subject configuration — edit this file to adapt the app to a different subject/exam.
 *
 * Each "subject" has its own:
 *  - Branding text (app title, footer, hero section)
 *  - Question source file
 *  - Question scope options (e.g. "all", "first 200", etc.)
 *  - Exam parameters (question count, duration, eligible pool)
 *  - Question grid groups shown on the Profile page
 */
import type { Question } from "../types"

export interface ScopeOption {
  value: string
  /** Label shown in the settings UI */
  label: string
  /**
   * Receives the full list of questions already sorted by id ascending.
   * Return the subset that belongs to this scope.
   */
  filter: (sortedQuestions: Question[]) => Question[]
}

export interface QuestionGroup {
  /** Section heading shown on the Profile page */
  label: string
  filter: (q: Question) => boolean
}

export interface SubjectConfig {
  /** Browser/tab title and header link text */
  appTitle: string
  /** Short title used in the <header> navigation link */
  headerTitle: string

  /** Hero section */
  heroTitle: string
  heroSubtitle: string

  /** Footer line */
  footerText: string

  /** File served from /public — loaded via fetch */
  questionsFileName: string

  /** Scope selector options rendered in QuizPage settings */
  scopes: ScopeOption[]
  /** Default scope value (must match one of `scopes[].value`) */
  defaultScope: string

  /** Mock exam (thi thử) configuration */
  exam: {
    questionCount: number
    durationSeconds: number
    /** Questions eligible to appear in the exam pool */
    poolFilter: (q: Question) => boolean
  }

  /**
   * Groups shown in the question grid on the Profile page.
   * Order determines display order.
   */
  questionGroups: QuestionGroup[]
}

// ---------------------------------------------------------------------------
// Current subject: Luật Đấu Thầu
// To switch subjects: update only this object.
// ---------------------------------------------------------------------------

const SUBJECT: SubjectConfig = {
  appTitle: "Luyện Thi Chứng Chỉ Đấu Thầu",
  headerTitle: "Luyện Thi Chứng Chỉ Đấu Thầu",

  heroTitle: "Luyện thi chứng chỉ đấu thầu",
  heroSubtitle:
    "Ôn tập với câu hỏi ngẫu nhiên, xem đáp án đúng ngay lập tức và theo dõi tiến độ của bạn.",

  footerText: "Ứng dụng luyện thi chứng chỉ đấu thầu · Làm bài không giới hạn",

  questionsFileName: "questions.json",

  scopes: [
    {
      value: "all",
      label: "Tất cả (1–390)",
      filter: (sorted) => sorted.filter((q) => q.id <= 390),
    },
    {
      value: "first200",
      label: "200 câu đầu (1–200)",
      filter: (sorted) => sorted.filter((q) => q.id <= 390).slice(0, 200),
    },
    {
      value: "after200",
      label: "Câu 201–390",
      filter: (sorted) => sorted.filter((q) => q.id <= 390).slice(200),
    },
    {
      value: "supplement50",
      label: "50 câu bổ sung (341–390)",
      filter: (sorted) => sorted.filter((q) => q.id <= 390).slice(340, 390),
    },
  ],
  defaultScope: "all",

  exam: {
    questionCount: 70,
    durationSeconds: 60 * 60,
    poolFilter: (q) => q.id >= 1 && q.id <= 390,
  },

  questionGroups: [
    {
      label: "390 câu cơ bản (1–340)",
      filter: (q) => q.id >= 1 && q.id <= 340,
    },
    {
      label: "50 câu bổ sung (341–390)",
      filter: (q) => q.id >= 341 && q.id <= 390,
    },
  ],
}

export default SUBJECT
