import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, XCircle, Circle, LogOut, UserPlus, LogIn } from "lucide-react"
import { getQuestionProgress, readProgress } from "../services/ProgressService"
import { getProgressSummary } from "../services/ProfileService"
import { getCloudSyncDebugStatus, reconcileCloudWithLocal } from "../services/CloudSyncService"
import {
  clearSupabaseAuthSession,
  getSupabaseAuthSession,
  signInWithSupabase,
  signUpWithSupabase,
} from "../services/SupabaseAuthService"
import { useProfile } from "../contexts/ProfileContext"
import type { Question, QuestionProgress } from "../types"
import SUBJECT from "../config/subject"
import { formatDuration } from "../utils/formatting"

export default function ProfilePage() {
  const { activeProfile, createProfile, login, resetPassword, logout } = useProfile()
  const [questions, setQuestions] = useState<Question[]>([])
  const [progress, setProgress] = useState<QuestionProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createPassword, setCreatePassword] = useState("")
  const [createConfirmPassword, setCreateConfirmPassword] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)
  const [authView, setAuthView] = useState<"login" | "signup" | "forgot">("login")
  const [loginName, setLoginName] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [forgotName, setForgotName] = useState("")
  const [forgotPassword, setForgotPassword] = useState("")
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("")
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)
  const [cloudEmail, setCloudEmail] = useState("")
  const [cloudPassword, setCloudPassword] = useState("")
  const [cloudMessage, setCloudMessage] = useState<string | null>(null)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudAuthSession, setCloudAuthSession] = useState(() => getSupabaseAuthSession())
  const cloudStatus = getCloudSyncDebugStatus()

  useEffect(() => {
    setProgress(readProgress(activeProfile?.id ?? null))
  }, [activeProfile?.id])

  useEffect(() => {
    const questionsUrl = `${import.meta.env.BASE_URL}${SUBJECT.questionsFileName}`
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
  const questionGroupData = useMemo(
    () => SUBJECT.questionGroups.map((group) => ({ ...group, items: questions.filter(group.filter) })),
    [questions],
  )

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

  const refreshCloudAuthState = () => {
    setCloudAuthSession(getSupabaseAuthSession())
  }

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
        <h2 className="text-lg font-semibold text-slate-900">Tài khoản cloud (Supabase Auth)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Đăng nhập email để đồng bộ dữ liệu giữa nhiều máy theo chuẩn production.
        </p>

        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Cloud sync: {cloudStatus.enabled ? "ON" : "OFF"} · hasUrl={cloudStatus.hasUrl ? "yes" : "no"} · hasAnonKey={cloudStatus.hasAnonKey ? "yes" : "no"} · hasAuth={cloudStatus.hasAuthSession ? "yes" : "no"}
        </div>

        <form
          className="mt-4 grid gap-2 sm:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (cloudBusy) return
            setCloudBusy(true)
            setCloudMessage(null)
            void signInWithSupabase(cloudEmail.trim(), cloudPassword)
              .then(async () => {
                refreshCloudAuthState()
                await reconcileCloudWithLocal()
                setCloudMessage("Đăng nhập cloud thành công, đã đồng bộ dữ liệu")
              })
              .catch((error) => {
                setCloudMessage(error instanceof Error ? error.message : "Đăng nhập cloud thất bại")
              })
              .finally(() => {
                setCloudBusy(false)
              })
          }}
        >
          <input
            type="email"
            value={cloudEmail}
            onChange={(event) => setCloudEmail(event.target.value)}
            placeholder="Email Supabase"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={cloudPassword}
            onChange={(event) => setCloudPassword(event.target.value)}
            placeholder="Mật khẩu Supabase"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={cloudBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-ms-blue px-3 py-2 text-sm font-semibold text-white hover:bg-ms-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" /> Đăng nhập cloud
          </button>
        </form>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={cloudBusy}
            onClick={() => {
              setCloudBusy(true)
              setCloudMessage(null)
              void signUpWithSupabase(cloudEmail.trim(), cloudPassword)
                .then(async (session) => {
                  refreshCloudAuthState()
                  if (session) {
                    await reconcileCloudWithLocal()
                    setCloudMessage("Đăng ký và đăng nhập cloud thành công")
                    return
                  }
                  setCloudMessage("Đăng ký thành công. Kiểm tra email xác nhận rồi đăng nhập.")
                })
                .catch((error) => {
                  setCloudMessage(error instanceof Error ? error.message : "Đăng ký cloud thất bại")
                })
                .finally(() => {
                  setCloudBusy(false)
                })
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Đăng ký cloud
          </button>
          <button
            type="button"
            onClick={() => {
              clearSupabaseAuthSession()
              refreshCloudAuthState()
              setCloudMessage("Đã đăng xuất cloud")
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đăng xuất cloud
          </button>
          {cloudAuthSession && (
            <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Đang đăng nhập: {cloudAuthSession.email ?? cloudAuthSession.userId}
            </span>
          )}
        </div>

        {cloudMessage && <p className="mt-2 text-xs text-slate-600">{cloudMessage}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Quản lý profile</h1>
          {!activeProfile ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Chưa đăng nhập</span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Đã đăng nhập</span>
          )}
        </div>

        {activeProfile && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-200 text-sm font-bold text-emerald-800">
                  {activeProfile.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm text-emerald-700">Đang đăng nhập</p>
                  <p className="text-base font-semibold text-emerald-900">{activeProfile.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                <LogOut className="h-4 w-4" /> Đăng xuất
              </button>
            </div>
          </div>
        )}

        {!activeProfile && (
          <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-4">
            {authView === "login" && (
              <>
                <h2 className="mb-2 text-sm font-semibold text-slate-800">Đăng nhập</h2>
                <div className="flex flex-col gap-2">
                  <input
                    value={loginName}
                    onChange={(event) => {
                      setLoginName(event.target.value)
                      if (loginError) setLoginError(null)
                    }}
                    placeholder="Tên đăng nhập"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => {
                      setLoginPassword(event.target.value)
                      if (loginError) setLoginError(null)
                    }}
                    placeholder="Mật khẩu"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const result = login(loginName, loginPassword)
                      if (!result.ok) {
                        setLoginError(result.error ?? "Đăng nhập thất bại")
                        return
                      }
                      setLoginPassword("")
                      setLoginError(null)
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-ms-blue px-3 py-2 text-sm font-semibold text-white hover:bg-ms-blue-dark"
                  >
                    <LogIn className="h-4 w-4" /> Đăng nhập
                  </button>
                </div>
                {loginError && <p className="mt-2 text-xs text-rose-600">{loginError}</p>}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView("signup")
                      setLoginError(null)
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Đăng ký
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView("forgot")
                      setLoginError(null)
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Quên mật khẩu
                  </button>
                </div>
              </>
            )}

            {authView === "signup" && (
              <>
                <h2 className="mb-2 text-sm font-semibold text-slate-800">Đăng ký</h2>
                <div className="flex flex-col gap-2">
                  <input
                    value={createName}
                    onChange={(event) => {
                      setCreateName(event.target.value)
                      if (createError) setCreateError(null)
                      if (createSuccess) setCreateSuccess(null)
                    }}
                    placeholder="Tên đăng nhập"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(event) => {
                      setCreatePassword(event.target.value)
                      if (createError) setCreateError(null)
                      if (createSuccess) setCreateSuccess(null)
                    }}
                    placeholder="Mật khẩu"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    value={createConfirmPassword}
                    onChange={(event) => {
                      setCreateConfirmPassword(event.target.value)
                      if (createError) setCreateError(null)
                      if (createSuccess) setCreateSuccess(null)
                    }}
                    placeholder="Xác nhận mật khẩu"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (createPassword !== createConfirmPassword) {
                        setCreateError("Mật khẩu xác nhận không khớp")
                        setCreateSuccess(null)
                        return
                      }
                      const result = createProfile(createName, createPassword)
                      if (!result.ok) {
                        setCreateError(result.error ?? "Không thể tạo profile")
                        setCreateSuccess(null)
                        return
                      }
                      setCreateName("")
                      setCreatePassword("")
                      setCreateConfirmPassword("")
                      setCreateError(null)
                      setCreateSuccess("Đăng ký thành công")
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-ms-blue px-3 py-2 text-sm font-semibold text-white hover:bg-ms-blue-dark"
                  >
                    <UserPlus className="h-4 w-4" /> Tạo tài khoản
                  </button>
                </div>
                {createError && <p className="mt-2 text-xs text-rose-600">{createError}</p>}
                {createSuccess && <p className="mt-2 text-xs text-emerald-700">{createSuccess}</p>}
                <button
                  type="button"
                  onClick={() => setAuthView("login")}
                  className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Quay lại đăng nhập
                </button>
              </>
            )}

            {authView === "forgot" && (
              <>
                <h2 className="mb-2 text-sm font-semibold text-slate-800">Quên mật khẩu</h2>
                <div className="flex flex-col gap-2">
                  <input
                    value={forgotName}
                    onChange={(event) => {
                      setForgotName(event.target.value)
                      if (forgotError) setForgotError(null)
                      if (forgotSuccess) setForgotSuccess(null)
                    }}
                    placeholder="Tên đăng nhập"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    value={forgotPassword}
                    onChange={(event) => {
                      setForgotPassword(event.target.value)
                      if (forgotError) setForgotError(null)
                      if (forgotSuccess) setForgotSuccess(null)
                    }}
                    placeholder="Mật khẩu mới"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(event) => {
                      setForgotConfirmPassword(event.target.value)
                      if (forgotError) setForgotError(null)
                      if (forgotSuccess) setForgotSuccess(null)
                    }}
                    placeholder="Xác nhận mật khẩu mới"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (forgotPassword !== forgotConfirmPassword) {
                        setForgotError("Mật khẩu xác nhận không khớp")
                        setForgotSuccess(null)
                        return
                      }
                      const result = resetPassword(forgotName, forgotPassword)
                      if (!result.ok) {
                        setForgotError(result.error ?? "Không thể đặt lại mật khẩu")
                        setForgotSuccess(null)
                        return
                      }
                      setForgotPassword("")
                      setForgotConfirmPassword("")
                      setForgotError(null)
                      setForgotSuccess("Đặt lại mật khẩu thành công")
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Đặt lại mật khẩu
                  </button>
                </div>
                {forgotError && <p className="mt-2 text-xs text-rose-600">{forgotError}</p>}
                {forgotSuccess && <p className="mt-2 text-xs text-emerald-700">{forgotSuccess}</p>}
                <button
                  type="button"
                  onClick={() => setAuthView("login")}
                  className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Quay lại đăng nhập
                </button>
              </>
            )}
          </div>
        )}
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
              {questionGroupData.map((group) => (
                <div key={group.label}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">{group.label}</h3>
                    <span className="text-xs text-slate-500">{group.items.length} câu</span>
                  </div>
                  {renderQuestionGrid(group.items)}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
