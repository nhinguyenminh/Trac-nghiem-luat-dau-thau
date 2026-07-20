import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, XCircle, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Play } from "lucide-react"
import { ATTEMPTS_KEY, useStats } from "../useStats"
import { useSettings } from "../useSettings"
import StatsPanel from "../components/StatsPanel"
import type { Question, QuestionScope } from "../types"

const LETTERS = ["A", "B", "C", "D"]
const AUTO_NEXT_MS = 3000

interface Attempt {
  question: Question
  selected: number
}

interface StoredAttempt {
  id: number
  selected: number
  question?: Question
}

function shouldShuffleOptions(question: Question): boolean {
  const answerText = String(question.options[question.answer] ?? "")
  const normalized = answerText.toLowerCase().trim()

  const hasMultipleCorrectAnswers =
    normalized.includes("đều đúng") ||
    normalized.includes("đều sai") ||
    normalized.includes("là đúng") ||
    normalized.includes("là sai") ||
    normalized.includes("cả") ||
    normalized.includes("và")

  return !hasMultipleCorrectAnswers
}

function getQuestionsForScope(questions: Question[], scope: QuestionScope): Question[] {
  const sorted = [...questions].sort((a, b) => a.id - b.id)
  if (scope === "first200") return sorted.slice(0, 200)
  if (scope === "after200") return sorted.slice(200)
  return sorted
}

function shuffleQuestion(question: Question): Question {
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

function readStoredAttempts(): StoredAttempt[] {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((a) => a && Number.isInteger(a?.id) && Number.isInteger(a?.selected))
      .map((a) => ({
        id: a.id,
        selected: a.selected,
        question: a.question && typeof a.question === "object" ? (a.question as Question) : undefined,
      }))
  } catch {
    return []
  }
}

export default function QuizPage() {
  const { stats, accuracy, record, reset } = useStats()
  const { settings, setValue } = useSettings()

  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [current, setCurrent] = useState<Question | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const [history, setHistory] = useState<Attempt[]>([])
  const [reviewIndex, setReviewIndex] = useState<number | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const pickRandom = useCallback((list: Question[], previousId?: number) => {
    if (list.length === 0) return null
    if (list.length === 1) return list[0]
    let next = list[Math.floor(Math.random() * list.length)]
    while (next.id === previousId) {
      next = list[Math.floor(Math.random() * list.length)]
    }
    return next
  }, [])

  const goNext = useCallback(() => {
    clearTimer()
    setReviewIndex(null)
    setSelected(null)
    setLocked(false)
    setCurrent((prev) => {
      const nextQuestion = pickRandom(questions, prev?.id)
      return nextQuestion ? shuffleQuestion(nextQuestion) : null
    })
  }, [questions, pickRandom, clearTimer])

  useEffect(() => {
    fetch("/questions.json")
      .then((res) => {
        if (!res.ok) throw new Error("failed")
        return res.json()
      })
      .then((data: Question[]) => {
        const rawQuestions = data.map((question) => ({ ...question }))
        setAllQuestions(rawQuestions)
        const scopedQuestions = getQuestionsForScope(rawQuestions, settings.questionScope)
        setQuestions(scopedQuestions)
        const firstQuestion = scopedQuestions[Math.floor(Math.random() * scopedQuestions.length)] ?? null
        setCurrent(firstQuestion ? shuffleQuestion(firstQuestion) : null)
        // rebuild session history from LocalStorage
        const byId = new Map(rawQuestions.map((q) => [q.id, q]))
        const restored: Attempt[] = []
        for (const a of readStoredAttempts()) {
          const q = byId.get(a.id)
          if (!q) continue
          const restoredQuestion = a.question ? { ...a.question } : shuffleQuestion(q)
          if (a.selected < restoredQuestion.options.length) restored.push({ question: restoredQuestion, selected: a.selected })
        }
        setHistory(restored)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (allQuestions.length === 0) return
    const scopedQuestions = getQuestionsForScope(allQuestions, settings.questionScope)
    setQuestions(scopedQuestions)
    setHistory([])
    setReviewIndex(null)
    setSelected(null)
    setLocked(false)
    setCurrent((prev) => {
      const nextQuestion = pickRandom(scopedQuestions, prev?.id)
      return nextQuestion ? shuffleQuestion(nextQuestion) : null
    })
  }, [allQuestions, settings.questionScope, pickRandom])

  // persist attempts whenever history changes
  useEffect(() => {
    if (loading) return
    const stored: StoredAttempt[] = history.map((a) => ({ id: a.question.id, selected: a.selected, question: a.question }))
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(stored))
  }, [history, loading])

  useEffect(() => clearTimer, [clearTimer])

  const handleSelect = (index: number) => {
    if (reviewIndex !== null || locked || !current) return
    setSelected(index)
    setLocked(true)
    const correct = index === current.answer
    record(correct)
    setHistory((prev) => [...prev, { question: current, selected: index }])
    if (settings.autoNext) {
      timerRef.current = setTimeout(goNext, AUTO_NEXT_MS)
    }
  }

  const openReview = (i: number) => {
    clearTimer()
    setReviewIndex(i)
  }

  const handleReset = () => {
    clearTimer()
    reset()
    setHistory([])
    setReviewIndex(null)
    setSelected(null)
    setLocked(false)
    setCurrent((prev) => {
      const nextQuestion = pickRandom(questions, prev?.id)
      return nextQuestion ? shuffleQuestion(nextQuestion) : null
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-ms-blue" />
        <p className="text-sm">Đang tải câu hỏi...</p>
      </div>
    )
  }

  if (error || !current) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-ms-red/30 bg-ms-red-light py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-ms-red" />
        <p className="text-sm font-medium text-slate-700">Không tải được dữ liệu câu hỏi.</p>
        <p className="text-xs text-slate-500">Vui lòng kiểm tra file questions.json.</p>
      </div>
    )
  }

  const reviewing = reviewIndex !== null
  const activeAttempt = reviewing ? history[reviewIndex] : null
  const shownQuestion = reviewing && activeAttempt ? activeAttempt.question : current
  const shownSelected = reviewing && activeAttempt ? activeAttempt.selected : selected
  const shownLocked = reviewing ? true : locked
  const isCorrect = shownSelected !== null && shownSelected === shownQuestion.answer
  const shouldShowNextButton = settings.showNextButton && !settings.autoNext

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <button
            type="button"
            onClick={() => setShowSettings((value) => !value)}
            className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ms-blue-soft text-ms-blue-dark">
              {showSettings ? "−" : "+"}
            </span>
            Cài đặt
          </button>

          {showSettings && (
            <div id="settings" className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                <span className="font-medium text-slate-700">Ôn:</span>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="questionScope"
                    checked={settings.questionScope === "all"}
                    onChange={() => setValue("questionScope", "all")}
                    className="h-4 w-4 border-slate-300 text-ms-blue focus:ring-ms-blue"
                  />
                  Tất cả
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="questionScope"
                    checked={settings.questionScope === "first200"}
                    onChange={() => setValue("questionScope", "first200")}
                    className="h-4 w-4 border-slate-300 text-ms-blue focus:ring-ms-blue"
                  />
                  200 câu đầu
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="questionScope"
                    checked={settings.questionScope === "after200"}
                    onChange={() => setValue("questionScope", "after200")}
                    className="h-4 w-4 border-slate-300 text-ms-blue focus:ring-ms-blue"
                  />
                  200 câu sau
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <p className="mb-2 font-medium text-slate-800">Chế độ chuyển câu</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <input
                      type="radio"
                      name="transitionMode"
                      checked={settings.autoNext}
                      onChange={() => {
                        setValue("autoNext", true)
                        setValue("showNextButton", false)
                      }}
                      className="h-4 w-4 border-slate-300 text-ms-blue focus:ring-ms-blue"
                    />
                    <span>Tự động chuyển câu sau 3 giây</span>
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <input
                      type="radio"
                      name="transitionMode"
                      checked={!settings.autoNext}
                      onChange={() => {
                        setValue("autoNext", false)
                        setValue("showNextButton", true)
                      }}
                      className="h-4 w-4 border-slate-300 text-ms-blue focus:ring-ms-blue"
                    />
                    <span>Chuyển câu bằng nút</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                reviewing ? "bg-slate-100 text-slate-600" : "bg-ms-blue-soft text-ms-blue-dark"
              }`}
            >
              {reviewing ? `Xem lại · Câu số ${reviewIndex + 1}` : "Câu hỏi ngẫu nhiên"}
            </span>
            {shownLocked && (
              <span
                className={`flex items-center gap-1 text-sm font-semibold ${
                  isCorrect ? "text-ms-green" : "text-ms-red"
                }`}
              >
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Chính xác!
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" /> Chưa đúng
                  </>
                )}
              </span>
            )}
          </div>

          <h2 className="text-pretty text-lg font-semibold leading-relaxed text-slate-800 sm:text-xl">
            {shownQuestion.question}
          </h2>

          <div className="mt-5 flex flex-col gap-3">
            {shownQuestion.options.map((option, index) => {
              const isAnswer = index === shownQuestion.answer
              const isPicked = index === shownSelected

              let styles = "border-slate-200 bg-white hover:border-ms-blue hover:bg-ms-blue-light"
              if (shownLocked) {
                if (isAnswer) {
                  styles = "border-ms-green bg-ms-green-light text-slate-800"
                } else if (isPicked) {
                  styles = "border-ms-red bg-ms-red-light text-slate-800"
                } else {
                  styles = "border-slate-200 bg-white opacity-70"
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => handleSelect(index)}
                  disabled={shownLocked}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all sm:text-base ${styles} ${
                    shownLocked ? "cursor-default" : "cursor-pointer"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      shownLocked && isAnswer
                        ? "bg-ms-green text-white"
                        : shownLocked && isPicked
                          ? "bg-ms-red text-white"
                          : "bg-ms-blue-soft text-ms-blue-dark"
                    }`}
                  >
                    {LETTERS[index]}
                  </span>
                  <span className="flex-1">{option}</span>
                  {shownLocked && isAnswer && <CheckCircle2 className="h-5 w-5 text-ms-green" />}
                  {shownLocked && isPicked && !isAnswer && <XCircle className="h-5 w-5 text-ms-red" />}
                </button>
              )
            })}
          </div>

          {shownLocked && (
            <div className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
              Đáp án đúng:{" "}
              <span className="font-semibold text-ms-green">
                {LETTERS[shownQuestion.answer]}. {shownQuestion.options[shownQuestion.answer]}
              </span>
              {!reviewing && (
                <span className="ml-1 text-slate-400">
                  {settings.autoNext
                    ? "· Tự động chuyển câu sau 3 giây..."
                    : shouldShowNextButton
                      ? "· Bấm nút chuyển câu để tiếp tục."
                      : "· Bạn có thể tiếp tục khi sẵn sàng."}
                </span>
              )}
            </div>
          )}

          {!reviewing && shownLocked && shouldShowNextButton && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-lg bg-ms-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ms-blue-dark"
              >
                <Play className="h-4 w-4" /> Câu tiếp theo
              </button>
            </div>
          )}

          {reviewing && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setReviewIndex(Math.max(0, reviewIndex - 1))}
                disabled={reviewIndex === 0}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Câu trước
              </button>
              <button
                onClick={() => setReviewIndex(Math.min(history.length - 1, reviewIndex + 1))}
                disabled={reviewIndex >= history.length - 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Câu sau <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={goNext}
                className="ml-auto flex items-center gap-1 rounded-lg bg-ms-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-ms-blue-dark"
              >
                <Play className="h-4 w-4" /> Tiếp tục làm bài
              </button>
            </div>
          )}
        </div>

        <section>
          <h3 className="mb-3 text-base font-semibold text-slate-800">Thống kê</h3>
          <StatsPanel stats={stats} accuracy={accuracy} onReset={handleReset} />
        </section>
      </div>

      {/* Navigator / review grid */}
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:w-72 lg:flex-shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Câu đã trả lời</h3>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {history.length}
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs leading-relaxed text-slate-400">
            Chưa có câu nào. Trả lời câu hỏi để xem lại đáp án tại đây.
          </p>
        ) : (
          <>
            <div className="grid max-h-[60vh] grid-cols-6 gap-2 overflow-y-auto pr-1 lg:grid-cols-5">
              {history.map((attempt, i) => {
                const correct = attempt.selected === attempt.question.answer
                const active = reviewIndex === i
                return (
                  <button
                    key={i}
                    onClick={() => openReview(i)}
                    title={correct ? "Đúng" : "Sai"}
                    className={`flex h-9 w-full items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all ${
                      correct
                        ? "border-ms-green text-ms-green hover:bg-ms-green-light"
                        : "border-ms-red text-ms-red hover:bg-ms-red-light"
                    } ${active ? (correct ? "bg-ms-green-light ring-2 ring-ms-green/40" : "bg-ms-red-light ring-2 ring-ms-red/40") : "bg-white"}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border-2 border-ms-green" /> Đúng
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded border-2 border-ms-red" /> Sai
              </span>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
