import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import { CheckCircle2, XCircle, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Play } from "lucide-react"
import { getAttemptsStorageKey, useStats } from "../useStats"
import { useSettings } from "../useSettings"
import StatsPanel from "../components/StatsPanel"
import { readProgress, resetProgress, updateQuestionProgress, writeProgress } from "../services/ProgressService"
import { useProfile } from "../contexts/ProfileContext"
import type { Question, QuestionProgress, QuestionScope } from "../types"

const LETTERS = ["A", "B", "C", "D"]
const AUTO_NEXT_MS = 3000

interface QuizPageProps {
  practiceQuestionId?: number
}

interface Attempt {
  question: Question
  selected: number
}

interface StoredAttempt {
  id: number
  selected: number
  question?: Question
}

function normalizeText(value: string): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim()
}

function shouldShuffleOptions(question: Question): boolean {
  const text = normalizeText(`${question.question} ${question.options.join(" ")}`)
  const answerText = normalizeText(question.options[question.answer] ?? "")
  const haystack = `${text} ${answerText}`

  const shouldKeepOriginalOrder =
    /đều\s+(đúng|sai)/.test(haystack) ||
    /là\s+(đúng|sai)/.test(haystack) ||
    /\b(đáp\s+án|phương\s+án|các\s+phương\s+án|tất\s+cả\s+phương\s+án|tất\s+cả\s+các\s+phương\s+án)\b[^\n]*\b(và|,|\/)\b/.test(haystack) ||
    /tất\s+cả\s+(các\s+)?phương\s+án/.test(haystack) ||
    /mọi\s+phương\s+án/.test(haystack) ||
    /phương\s+án\s+trên/.test(haystack) ||
    /cả\s+\d+\s+phương\s+án/.test(haystack)

  return !shouldKeepOriginalOrder
}

function getQuestionsForScope(questions: Question[], scope: QuestionScope): Question[] {
  const sorted = [...questions].sort((a, b) => a.id - b.id)
  const baseQuestions = sorted.filter((question) => question.id <= 390)

  if (scope === "first200") return baseQuestions.slice(0, 200)
  if (scope === "after200") return baseQuestions.slice(200)
  if (scope === "supplement50") return baseQuestions.slice(340, 390)
  return baseQuestions
}

function getQuestionsForCategories(questions: Question[], selectedCategories: string[]): Question[] {
  if (selectedCategories.length === 0) return questions
  return questions.filter((question) => {
    const category = (question.category ?? "").trim()
    return selectedCategories.includes(category)
  })
}

function getFilteredQuestions(questions: Question[], scope: QuestionScope, selectedCategories: string[]): Question[] {
  const scopedQuestions = getQuestionsForScope(questions, scope)
  return getQuestionsForCategories(scopedQuestions, selectedCategories)
}

function getQuestionCategories(questions: Question[]): string[] {
  return Array.from(new Set(questions.map((question) => (question.category ?? "").trim()).filter(Boolean))).sort()
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

function getQuestionDifficultyScore(progress: QuestionProgress | undefined): number {
  if (!progress) return 0
  const attempts = progress.correctCount + progress.wrongCount
  const averageResponseTimeMs = attempts > 0 ? progress.totalResponseTimeMs / attempts : 0

  return progress.wrongCount * 100 + averageResponseTimeMs / 1000
}

function buildQuestionQueue(
  sourceQuestions: Question[],
  progressMap: Map<number, QuestionProgress>,
  previousQuestionId?: number,
): Question[] {
  const sorted = [...sourceQuestions].sort((a, b) => {
    const aProgress = progressMap.get(a.id)
    const bProgress = progressMap.get(b.id)
    const wrongDiff = (bProgress?.wrongCount ?? 0) - (aProgress?.wrongCount ?? 0)
    if (wrongDiff !== 0) return wrongDiff

    const aAttempts = (aProgress?.correctCount ?? 0) + (aProgress?.wrongCount ?? 0)
    const bAttempts = (bProgress?.correctCount ?? 0) + (bProgress?.wrongCount ?? 0)
    const aAvg = aAttempts > 0 && aProgress ? aProgress.totalResponseTimeMs / aAttempts : 0
    const bAvg = bAttempts > 0 && bProgress ? bProgress.totalResponseTimeMs / bAttempts : 0
    if (bAvg !== aAvg) return bAvg - aAvg

    return Math.random() - 0.5
  })

  const maxScore = sorted.reduce((max, question) => {
    const score = getQuestionDifficultyScore(progressMap.get(question.id))
    return score > max ? score : max
  }, 0)

  const expanded: Question[] = []
  for (const question of sorted) {
    const score = getQuestionDifficultyScore(progressMap.get(question.id))
    const repeats = maxScore <= 0 ? 1 : Math.max(1, Math.min(10, Math.round((score / maxScore) * 10)))
    for (let i = 0; i < repeats; i++) {
      expanded.push(question)
    }
  }

  const shuffled = expanded.length > 0 ? expanded : sorted
  if (previousQuestionId == null || shuffled.length <= 1) return shuffled

  const firstDifferentIndex = shuffled.findIndex((question) => question.id !== previousQuestionId)
  if (firstDifferentIndex <= 0) return shuffled

  const [firstDifferentQuestion] = shuffled.splice(firstDifferentIndex, 1)
  shuffled.unshift(firstDifferentQuestion)
  return shuffled
}

function readStoredAttempts(storageKey: string | null): StoredAttempt[] {
  if (!storageKey) return []
  try {
    const raw = localStorage.getItem(storageKey)
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

function restoreAttempts(rawQuestions: Question[], storedAttempts: StoredAttempt[]): Attempt[] {
  const byId = new Map(rawQuestions.map((question) => [question.id, question]))
  const restored: Attempt[] = []

  for (const attempt of storedAttempts) {
    const question = byId.get(attempt.id)
    if (!question) continue

    const restoredQuestion = attempt.question ? { ...attempt.question } : shuffleQuestion(question)
    if (attempt.selected < restoredQuestion.options.length) {
      restored.push({ question: restoredQuestion, selected: attempt.selected })
    }
  }

  return restored
}

export default function QuizPage({ practiceQuestionId }: QuizPageProps) {
  const location = useLocation()
  const { activeProfile } = useProfile()
  const profileId = activeProfile?.id ?? null
  const { stats, accuracy, record, reset } = useStats(profileId)
  const { settings, setValue, toggleCategory } = useSettings(profileId)

  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [current, setCurrent] = useState<Question | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)
  const [showSettings, setShowSettings] = useState(() => (typeof window !== "undefined" ? window.location.hash === "#settings" : false))

  const [history, setHistory] = useState<Attempt[]>([])
  const [reviewIndex, setReviewIndex] = useState<number | null>(null)
  const [progress, setProgress] = useState<QuestionProgress[]>([])
  const availableCategories = useMemo(() => getQuestionCategories(allQuestions), [allQuestions])

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const questionQueueRef = useRef<Question[]>([])
  const hasLoadedInitialQuestions = useRef(false)
  const questionStartedAtRef = useRef<number>(Date.now())
  const progressRef = useRef<QuestionProgress[]>([])

  const attemptsStorageKey = useMemo(() => (profileId ? getAttemptsStorageKey(profileId) : null), [profileId])

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const initializeQuestions = useCallback((sourceQuestions: Question[], previousQuestionId?: number) => {
    if (sourceQuestions.length === 0) {
      questionQueueRef.current = []
      setCurrent(null)
      return
    }

    const queue = buildQuestionQueue(sourceQuestions, new Map(progressRef.current.map((item) => [item.questionId, item])), previousQuestionId)
    const firstQuestion = queue[0] ?? null
    questionQueueRef.current = firstQuestion ? queue.slice(1) : []
    questionStartedAtRef.current = Date.now()
    setCurrent(firstQuestion ? shuffleQuestion(firstQuestion) : null)
  }, [])

  const applyQuestionSelection = useCallback(
    (rawQuestions: Question[], shouldResetHistory = true) => {
      const filteredQuestions = getFilteredQuestions(rawQuestions, settings.questionScope, settings.selectedCategories)
      setAllQuestions(rawQuestions)
      setQuestions(filteredQuestions)

      if (shouldResetHistory) {
        setHistory([])
        setReviewIndex(null)
        setSelected(null)
        setLocked(false)
      }

      if (practiceQuestionId != null) {
        const practiceQuestion = filteredQuestions.find((question) => question.id === practiceQuestionId) ?? null
        questionStartedAtRef.current = Date.now()
        setCurrent(practiceQuestion ? shuffleQuestion(practiceQuestion) : null)
        questionQueueRef.current = []
      } else {
        initializeQuestions(filteredQuestions)
      }
    },
    [initializeQuestions, practiceQuestionId, settings.questionScope, settings.selectedCategories],
  )

  const goNext = useCallback(() => {
    clearTimer()
    setReviewIndex(null)
    setSelected(null)
    setLocked(false)

    const queue =
      questionQueueRef.current.length > 0
        ? questionQueueRef.current
        : buildQuestionQueue(
            questions,
            new Map(progressRef.current.map((item) => [item.questionId, item])),
            current?.id,
          )
    const nextQuestion = queue[0] ?? null
    questionQueueRef.current = nextQuestion ? queue.slice(1) : []
    questionStartedAtRef.current = Date.now()
    setCurrent(nextQuestion ? shuffleQuestion(nextQuestion) : null)
  }, [questions, current?.id, clearTimer])

  useEffect(() => {
    setProgress(readProgress(profileId))
    const questionsUrl = `${import.meta.env.BASE_URL}questions.json`
    fetch(questionsUrl)
      .then((res) => {
        if (!res.ok) throw new Error("failed")
        return res.json()
      })
      .then((data: Question[]) => {
        const rawQuestions = data.map((question) => ({ ...question }))
        applyQuestionSelection(rawQuestions, false)
        setHistory(restoreAttempts(rawQuestions, readStoredAttempts(attemptsStorageKey)))
        hasLoadedInitialQuestions.current = true
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [applyQuestionSelection, profileId, attemptsStorageKey])

  useEffect(() => {
    if (!profileId) {
      setProgress([])
      setHistory([])
      setReviewIndex(null)
      setSelected(null)
      setLocked(false)
      return
    }

    if (allQuestions.length === 0 || !hasLoadedInitialQuestions.current) return
    applyQuestionSelection(allQuestions, true)
  }, [allQuestions, applyQuestionSelection, profileId])

  // persist attempts whenever history changes
  useEffect(() => {
    if (loading || !attemptsStorageKey) return
    const stored: StoredAttempt[] = history.map((a) => ({ id: a.question.id, selected: a.selected, question: a.question }))
    localStorage.setItem(attemptsStorageKey, JSON.stringify(stored))
  }, [history, loading, attemptsStorageKey])

  useEffect(() => clearTimer, [clearTimer])

  useEffect(() => {
    const shouldShow = location.hash === "#settings"
    setShowSettings(shouldShow)

    if (shouldShow) {
      window.requestAnimationFrame(() => {
        const settingsElement = document.getElementById("settings")
        settingsElement?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }, [location.hash])

  const handleSelect = (index: number) => {
    if (reviewIndex !== null || locked || !current) return
    setSelected(index)
    setLocked(true)
    const correct = index === current.answer
    record(correct)
    const responseTimeMs = Date.now() - questionStartedAtRef.current
    setProgress((prev) => {
      const next = updateQuestionProgress(prev, current.id, correct, responseTimeMs)
      writeProgress(profileId, next)
      return next
    })
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
    setProgress(resetProgress(profileId))
    setHistory([])
    setReviewIndex(null)
    setSelected(null)
    setLocked(false)
    initializeQuestions(questions)
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
  const isAllCategoriesSelected = availableCategories.length > 0 && settings.selectedCategories.length === availableCategories.length

  const handleToggleAllCategories = () => {
    if (isAllCategoriesSelected) {
      setValue("selectedCategories", [])
      return
    }

    setValue("selectedCategories", availableCategories)
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              const nextValue = !showSettings
              setShowSettings(nextValue)

              if (typeof window !== "undefined") {
                const url = new URL(window.location.href)
                url.hash = nextValue ? "settings" : ""
                window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
              }
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-ms-blue-soft text-ms-blue-dark">
              {showSettings ? "−" : "+"}
            </span>
            Thiết lập
          </button>
        </div>

        {!activeProfile && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Chưa đăng nhập profile. Kết quả làm bài sẽ không được lưu. Vào trang Hồ sơ để đăng nhập.
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
                  200 câu đầu (bộ 390)
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="questionScope"
                    checked={settings.questionScope === "after200"}
                    onChange={() => setValue("questionScope", "after200")}
                    className="h-4 w-4 border-slate-300 text-ms-blue focus:ring-ms-blue"
                  />
                  200 câu sau (bộ 390)
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    name="questionScope"
                    checked={settings.questionScope === "supplement50"}
                    onChange={() => setValue("questionScope", "supplement50")}
                    className="h-4 w-4 border-slate-300 text-ms-blue focus:ring-ms-blue"
                  />
                  50 câu bổ sung (STT 341-390)
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

              {availableCategories.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                  <p className="mb-2 font-medium text-slate-800">Hạng mục cần ôn</p>
                  <label className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isAllCategoriesSelected}
                      onChange={handleToggleAllCategories}
                      className="h-4 w-4 rounded border-slate-300 text-ms-blue focus:ring-ms-blue"
                    />
                    <span>Tất cả hạng mục</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map((category) => {
                      const checked = settings.selectedCategories.includes(category)
                      return (
                        <label key={category} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(category)}
                            className="h-4 w-4 rounded border-slate-300 text-ms-blue focus:ring-ms-blue"
                          />
                          <span>{category}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!showSettings && (
            <>
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

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {shownQuestion.category ?? "Chung"}
                </span>
                <span className="text-xs text-slate-500">STT {shownQuestion.id}</span>
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

            <section>
              <h3 className="mb-3 text-base font-semibold text-slate-800">Thống kê</h3>
              <StatsPanel stats={stats} accuracy={accuracy} onReset={handleReset} />
            </section>
            </>
          )}
        </div>

        {/* Main column wrapper closing tag */}
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
