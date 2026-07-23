import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, XCircle, Circle } from "lucide-react"
import { getQuestionProgress, readProgress } from "../services/ProgressService"
import { getProgressSummary } from "../services/ProfileService"
import type { Question, QuestionProgress } from "../types"

export default function ProfilePage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [progress, setProgress] = useState<QuestionProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setProgress(readProgress())
    fetch("/questions.json")
      .then((res) => {
        if (!res.ok) throw new Error("failed")
        return res.json()
      })
      .then((data: Question[]) => {
        setQuestions(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  const summary = useMemo(() => getProgressSummary(questions, progress), [questions, progress])
  const baseQuestions = useMemo(() => questions.filter((question) => question.id <= 390), [questions])
  const supplementQuestions = useMemo(
    () => baseQuestions.filter((question) => question.id >= 341 && question.id <= 390),
    [baseQuestions],
  )

  const renderQuestionGrid = (items: Question[]) => (
    <div className="grid max-h-[50vh] grid-cols-5 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-10">
      {items.map((question) => {
        const status = getQuestionProgress(progress, question.id).status
        const isCorrect = status === "correct"
        const isWrong = status === "wrong"
        const baseClasses =
          "flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition"
        const statusClasses = isCorrect
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          : isWrong
          ? "border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"

        return (
          <Link
            key={question.id}
            to={`/practice/${question.id}`}
            className={`${baseClasses} ${statusClasses}`}
            title={`Câu ${question.id} · ${status === "correct" ? "Đúng" : status === "wrong" ? "Sai" : "Chưa xem"}`}
          >
            {question.id}
          </Link>
        )
      })}
    </div>
  )

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
        <p className="text-sm">Đang tải hồ sơ học tập...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-ms-red/30 bg-ms-red-light py-16 text-center">
        <p className="text-sm font-medium text-slate-700">Không tải được dữ liệu câu hỏi.</p>
        <p className="text-xs text-slate-500">Vui lòng kiểm tra file questions.json.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Hồ sơ ôn tập</h1>
            <p className="mt-1 text-sm text-slate-600">Theo dõi trạng thái từng câu hỏi, chuyển sang Luyện tập ngay.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <span>Toàn bộ câu hỏi: {questions.length}</span>
            <span>Đúng: {summary.correct}</span>
            <span>Sai: {summary.wrong}</span>
            <span>Chưa làm: {summary.unseen}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="h-4 w-4 text-ms-green" />
              <span className="text-sm font-semibold">Đã trả lời đúng</span>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{summary.correct}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <XCircle className="h-4 w-4 text-ms-red" />
              <span className="text-sm font-semibold">Đã trả lời sai</span>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{summary.wrong}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2 text-slate-700">
              <Circle className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold">Chưa xem</span>
            </div>
            <p className="text-2xl font-semibold text-slate-900">{summary.unseen}</p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Danh sách câu hỏi</h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1">
              <Circle className="h-3 w-3 text-slate-400" /> Chưa xem
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
              <CheckCircle2 className="h-3 w-3 text-ms-green" /> Đúng
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1">
              <XCircle className="h-3 w-3 text-ms-red" /> Sai
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Bộ 390 câu</h3>
              <span className="text-xs text-slate-500">{baseQuestions.length} câu</span>
            </div>
            {renderQuestionGrid(baseQuestions)}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">50 câu bổ sung (STT 341-390)</h3>
              <span className="text-xs text-slate-500">{supplementQuestions.length} câu</span>
            </div>
            {renderQuestionGrid(supplementQuestions)}
          </div>
        </div>
      </section>
    </div>
  )
}
