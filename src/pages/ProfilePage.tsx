import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, XCircle, Circle, LogOut, UserPlus, Trash2, LogIn } from "lucide-react"
import { getQuestionProgress, readProgress } from "../services/ProgressService"
import { getProgressSummary } from "../services/ProfileService"
import { useProfile } from "../contexts/ProfileContext"
import type { Question, QuestionProgress, UserProfile } from "../types"

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0s"
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  return `${min}m ${remSec}s`
}

interface ProfileRowProps {
  profile: UserProfile
  isActive: boolean
  onLogin: (profileId: string, password: string) => { ok: boolean; error?: string }
  onDelete: (profileId: string) => void
}

function ProfileRow({ profile, isActive, onLogin, onDelete }: ProfileRowProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{profile.name}</p>
          <p className="text-xs text-slate-500">Lần đăng nhập cuối: {new Date(profile.lastLoginAt).toLocaleString("vi-VN")}</p>
        </div>
        {isActive && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">Đang dùng</span>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value)
            if (error) setError(null)
          }}
          placeholder="Nhập mật khẩu"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            const result = onLogin(profile.id, password)
            if (!result.ok) {
              setError(result.error ?? "Đăng nhập thất bại")
              return
            }
            setPassword("")
            setError(null)
          }}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-ms-blue px-3 py-2 text-sm font-semibold text-white hover:bg-ms-blue-dark"
        >
          <LogIn className="h-4 w-4" /> Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => onDelete(profile.id)}
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" /> Xóa
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  )
}

export default function ProfilePage() {
  const { profiles, activeProfile, createProfile, login, logout, deleteProfile } = useProfile()
  const [questions, setQuestions] = useState<Question[]>([])
  const [progress, setProgress] = useState<QuestionProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    setProgress(readProgress(activeProfile?.id ?? null))
  }, [activeProfile?.id])

  useEffect(() => {
    const questionsUrl = `${import.meta.env.BASE_URL}questions.json`
    fetch(questionsUrl)
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
  const baseQuestions = useMemo(() => questions.filter((question) => question.id >= 1 && question.id <= 340), [questions])
  const supplementQuestions = useMemo(() => questions.filter((question) => question.id >= 341 && question.id <= 390), [questions])

  const difficultQuestions = useMemo(() => {
    const progressById = new Map(progress.map((item) => [item.questionId, item]))
    return questions
      .map((question) => {
        const item = progressById.get(question.id)
        const attempts = (item?.correctCount ?? 0) + (item?.wrongCount ?? 0)
        const avgTime = attempts > 0 && item ? item.totalResponseTimeMs / attempts : 0
        return {
          question,
          wrongCount: item?.wrongCount ?? 0,
          avgTime,
          attempts,
        }
      })
      .filter((item) => item.wrongCount > 0 || item.avgTime > 0)
      .sort((a, b) => {
        if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount
        if (b.avgTime !== a.avgTime) return b.avgTime - a.avgTime
        return b.attempts - a.attempts
      })
      .slice(0, 10)
  }, [questions, progress])

  const renderQuestionGrid = (items: Question[]) => (
    <div className="grid max-h-[50vh] grid-cols-5 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-10">
      {items.map((question) => {
        const status = getQuestionProgress(progress, question.id).status
        const isCorrect = status === "correct"
        const isWrong = status === "wrong"
        const baseClasses = "flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition"
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
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Quản lý profile</h1>
          {activeProfile ? (
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" /> Đăng xuất
            </button>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Chưa đăng nhập</span>
          )}
        </div>

        {activeProfile && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Đang đăng nhập: <span className="font-semibold">{activeProfile.name}</span>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Tạo profile mới</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={createName}
              onChange={(event) => {
                setCreateName(event.target.value)
                if (createError) setCreateError(null)
              }}
              placeholder="Tên profile"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={createPassword}
              onChange={(event) => {
                setCreatePassword(event.target.value)
                if (createError) setCreateError(null)
              }}
              placeholder="Mật khẩu"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const result = createProfile(createName, createPassword)
                if (!result.ok) {
                  setCreateError(result.error ?? "Không thể tạo profile")
                  return
                }
                setCreateName("")
                setCreatePassword("")
                setCreateError(null)
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ms-blue px-3 py-2 text-sm font-semibold text-white hover:bg-ms-blue-dark"
            >
              <UserPlus className="h-4 w-4" /> Tạo profile
            </button>
          </div>
          {createError && <p className="mt-2 text-xs text-rose-600">{createError}</p>}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {profiles.map((profile) => (
            <ProfileRow
              key={profile.id}
              profile={profile}
              isActive={activeProfile?.id === profile.id}
              onLogin={login}
              onDelete={deleteProfile}
            />
          ))}
        </div>
      </section>

      {!activeProfile ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="text-sm text-slate-600">Đăng nhập profile để xem tiến độ và luyện tập theo câu khó.</p>
        </section>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Hồ sơ ôn tập</h2>
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
            <h2 className="mb-3 text-base font-semibold text-slate-900">Top câu khó (ưu tiên lên đầu khi luyện)</h2>
            {difficultQuestions.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có dữ liệu đủ để xếp hạng câu khó.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-2">STT</th>
                      <th className="py-2 pr-2">Câu</th>
                      <th className="py-2 pr-2">Sai</th>
                      <th className="py-2 pr-2">T/gian TB</th>
                      <th className="py-2 pr-2">Luyện</th>
                    </tr>
                  </thead>
                  <tbody>
                    {difficultQuestions.map((item) => (
                      <tr key={item.question.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2 font-semibold text-slate-800">{item.question.id}</td>
                        <td className="py-2 pr-2 text-slate-700">{item.question.question}</td>
                        <td className="py-2 pr-2 text-rose-700">{item.wrongCount}</td>
                        <td className="py-2 pr-2 text-amber-700">{formatDuration(item.avgTime)}</td>
                        <td className="py-2 pr-2">
                          <Link to={`/practice/${item.question.id}`} className="text-ms-blue hover:underline">
                            Vào câu
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

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
                  <h3 className="text-sm font-semibold text-slate-800">Bộ chính (STT 1-340)</h3>
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
        </>
      )}
    </div>
  )
}
