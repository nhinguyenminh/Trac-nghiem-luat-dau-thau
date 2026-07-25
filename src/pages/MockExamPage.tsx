import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Flag, Loader2 } from "lucide-react"
import type { Question } from "../types"

const EXAM_QUESTION_COUNT = 70
const EXAM_DURATION_SECONDS = 60 * 60
const LETTERS = ["A", "B", "C", "D"]

function shuffle<T>(source: T[]): T[] {
  const arr = [...source]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds)
  const h = Math.floor(safeSeconds / 3600)
  const m = Math.floor((safeSeconds % 3600) / 60)
  const s = safeSeconds % 60

  const hh = String(h).padStart(2, "0")
  const mm = String(m).padStart(2, "0")
  const ss = String(s).padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

function computeScore(examQuestions: Question[], selectedAnswers: Record<number, number | null>): number {
  if (examQuestions.length === 0) return 0
  const correctCount = examQuestions.reduce((count, question) => {
    return count + (selectedAnswers[question.id] === question.answer ? 1 : 0)
  }, 0)

  return Math.round((correctCount / examQuestions.length) * 100)
}

export default function MockExamPage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [examQuestions, setExamQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [focusedQuestionId, setFocusedQuestionId] = useState<number | null>(null)
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(EXAM_DURATION_SECONDS)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number | null>>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const questionsUrl = `${import.meta.env.BASE_URL}questions.json`
    fetch(questionsUrl)
      .then((res) => {
        if (!res.ok) throw new Error("failed")
        return res.json()
      })
      .then((data: Question[]) => {
        const pool = data.filter((q) => q.id >= 1 && q.id <= 390)
        const selected = shuffle(pool).slice(0, EXAM_QUESTION_COUNT)
        setAllQuestions(pool)
        setExamQuestions(selected)
        const initialAnswers: Record<number, number | null> = {}
        const initialFlags: Record<number, boolean> = {}
        for (const question of selected) {
          initialAnswers[question.id] = null
          initialFlags[question.id] = false
        }
        setSelectedAnswers(initialAnswers)
        setFlaggedQuestions(initialFlags)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!hasStarted || isSubmitted) return

    const timer = window.setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          setIsSubmitted(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [hasStarted, isSubmitted])

  const selectedCount = useMemo(
    () => examQuestions.filter((q) => selectedAnswers[q.id] != null).length,
    [examQuestions, selectedAnswers],
  )
  const score = useMemo(() => computeScore(examQuestions, selectedAnswers), [examQuestions, selectedAnswers])

  const handleStart = () => {
    const confirmed = window.confirm("Bài thi thử gồm 70 câu trong 60 phút. Bạn có chắc muốn bắt đầu?")
    if (!confirmed) return
    setHasStarted(true)
    setIsSubmitted(false)
    setFocusedQuestionId(examQuestions[0]?.id ?? null)
    setTimeLeftSeconds(EXAM_DURATION_SECONDS)
  }

  const handleSubmit = () => {
    const confirmed = window.confirm("Bạn có chắc muốn nộp bài ngay bây giờ không?")
    if (!confirmed) return
    setIsSubmitted(true)
  }

  const handleRestart = () => {
    const selected = shuffle(allQuestions).slice(0, EXAM_QUESTION_COUNT)
    setExamQuestions(selected)
    const initialAnswers: Record<number, number | null> = {}
    const initialFlags: Record<number, boolean> = {}
    for (const question of selected) {
      initialAnswers[question.id] = null
      initialFlags[question.id] = false
    }
    setSelectedAnswers(initialAnswers)
    setFlaggedQuestions(initialFlags)
    setFocusedQuestionId(selected[0]?.id ?? null)
    setTimeLeftSeconds(EXAM_DURATION_SECONDS)
    setHasStarted(false)
    setIsSubmitted(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin text-ms-blue" />
        <p className="text-sm">Đang chuẩn bị đề thi thử...</p>
      </div>
    )
  }

  if (error || examQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-ms-red/30 bg-ms-red-light py-16 text-center">
        <AlertTriangle className="h-8 w-8 text-ms-red" />
        <p className="text-sm font-medium text-slate-700">Không thể tạo đề thi thử.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Thi thử 70 câu</h1>
            <p className="text-sm text-slate-600">Thời gian 60 phút. Thang điểm 100.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-right">
            <p className="text-xs uppercase text-slate-500">Thời gian còn lại</p>
            <p className={`text-lg font-bold ${timeLeftSeconds <= 300 ? "text-ms-red" : "text-ms-blue-dark"}`}>
              {formatTime(timeLeftSeconds)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-lg bg-slate-100 px-3 py-1">Đã chọn: {selectedCount}/{examQuestions.length}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-1">
            Đánh dấu: {Object.values(flaggedQuestions).filter(Boolean).length}
          </span>
          {!hasStarted && (
            <button
              type="button"
              onClick={handleStart}
              className="ml-auto rounded-lg bg-ms-blue px-4 py-2 font-semibold text-white hover:bg-ms-blue-dark"
            >
              Xác nhận bắt đầu làm bài
            </button>
          )}
          {hasStarted && !isSubmitted && (
            <button
              type="button"
              onClick={handleSubmit}
              className="ml-auto rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700"
            >
              Nộp bài
            </button>
          )}
          {isSubmitted && (
            <button
              type="button"
              onClick={handleRestart}
              className="ml-auto rounded-lg bg-ms-blue px-4 py-2 font-semibold text-white hover:bg-ms-blue-dark"
            >
              Tạo đề thi mới
            </button>
          )}
        </div>
      </section>

      {isSubmitted && (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-900">Kết quả thi thử</h2>
          <p className="mt-1 text-sm text-emerald-800">Điểm của bạn (thang 100)</p>
          <p className="mt-2 text-4xl font-bold text-emerald-700">{score}</p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_270px]">
        <section className="flex flex-col gap-4">
          {examQuestions.map((question, index) => {
            const selectedOption = selectedAnswers[question.id]
            const isFlagged = flaggedQuestions[question.id]
            return (
              <article
                key={question.id}
                id={`mock-question-${question.id}`}
                className={`rounded-2xl border bg-white p-5 shadow-sm ${
                  focusedQuestionId === question.id ? "border-ms-blue" : "border-slate-200"
                }`}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-ms-blue-soft px-3 py-1 text-xs font-semibold text-ms-blue-dark">
                    Câu {index + 1}/{examQuestions.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFlaggedQuestions((prev) => ({ ...prev, [question.id]: !prev[question.id] }))
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      isFlagged
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Flag className="h-3.5 w-3.5" /> {isFlagged ? "Đã đánh dấu" : "Đánh dấu nghi ngờ"}
                  </button>
                </div>

                <h3 className="text-lg font-semibold leading-relaxed text-slate-800">{question.question}</h3>

                <div className="mt-4 flex flex-col gap-3">
                  {question.options.map((option, optionIndex) => {
                    const picked = selectedOption === optionIndex
                    const showResult = isSubmitted
                    const isCorrectAnswer = optionIndex === question.answer

                    let styles = "border-slate-200 bg-white hover:border-ms-blue hover:bg-ms-blue-light"
                    if (picked) {
                      styles = "border-ms-blue bg-ms-blue-light"
                    }
                    if (showResult && isCorrectAnswer) {
                      styles = "border-ms-green bg-ms-green-light"
                    } else if (showResult && picked && !isCorrectAnswer) {
                      styles = "border-ms-red bg-ms-red-light"
                    }

                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        disabled={!hasStarted || isSubmitted}
                        onClick={() => {
                          setSelectedAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
                        }}
                        className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm transition-all sm:text-base ${styles} ${
                          !hasStarted || isSubmitted ? "cursor-default" : "cursor-pointer"
                        }`}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ms-blue-soft text-sm font-bold text-ms-blue-dark">
                          {LETTERS[optionIndex]}
                        </span>
                        <span>{option}</span>
                      </button>
                    )
                  })}
                </div>
              </article>
            )
          })}
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Danh sách câu hỏi</h3>
          <div className="grid max-h-[60vh] grid-cols-5 gap-2 overflow-y-auto">
            {examQuestions.map((question, index) => {
              const chosen = selectedAnswers[question.id] != null
              const flagged = flaggedQuestions[question.id]
              const active = focusedQuestionId === question.id

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => {
                    setFocusedQuestionId(question.id)
                    document.getElementById(`mock-question-${question.id}`)?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }}
                  className={`relative rounded-lg border-2 px-0 py-2 text-xs font-semibold ${
                    active
                      ? "border-ms-blue bg-ms-blue-light text-ms-blue-dark"
                      : chosen
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-600"
                  }`}
                  title={chosen ? "Đã chọn" : "Chưa chọn"}
                >
                  {index + 1}
                  {flagged && <Flag className="absolute right-0.5 top-0.5 h-3 w-3 text-amber-500" />}
                </button>
              )
            })}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <p>• Xanh lá: đã chọn đáp án</p>
            <p>• Trắng: chưa chọn</p>
            <p>• Có cờ: câu đang nghi ngờ</p>
          </div>
        </aside>
      </div>
    </div>
  )
}