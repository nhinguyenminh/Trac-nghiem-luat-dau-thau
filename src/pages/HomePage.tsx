import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Play, BookOpen, Infinity as InfinityIcon, Smartphone } from "lucide-react"
import { useStats } from "../useStats"
import StatsPanel from "../components/StatsPanel"
import type { Question } from "../types"
import { useProfile } from "../contexts/ProfileContext"

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-ms-blue-light p-3">
      <div className="mt-0.5 text-ms-blue">{icon}</div>
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-600">{desc}</div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { activeProfile } = useProfile()
  const { stats, accuracy, reset } = useStats(activeProfile?.id ?? null)
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const questionsUrl = `${import.meta.env.BASE_URL}questions.json`
    fetch(questionsUrl)
      .then((res) => res.json())
      .then((data: Question[]) => setCount(data.length))
      .catch(() => setCount(null))
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl bg-ms-blue px-6 py-10 text-center text-white shadow-md">
        <h1 className="text-balance text-2xl font-bold sm:text-3xl">Luyện thi chứng chỉ đấu thầu</h1>
        <p className="mx-auto mt-2 max-w-md text-pretty text-sm text-white/90 sm:text-base">
          Ôn tập với câu hỏi ngẫu nhiên, xem đáp án đúng ngay lập tức và theo dõi tiến độ của bạn.
        </p>
        <Link
          to="/quiz"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-ms-blue-dark shadow transition-transform hover:scale-105"
        >
          <Play className="h-4 w-4" fill="currentColor" />
          Bắt đầu luyện thi
        </Link>
        {count !== null && (
          <p className="mt-3 text-xs text-white/80">Ngân hàng câu hỏi: {count} câu</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Feature
          icon={<BookOpen className="h-5 w-5" />}
          title="Câu hỏi ngẫu nhiên"
          desc="Mỗi lần một câu khác nhau, phản hồi đúng/sai tức thì."
        />
        <Feature
          icon={<InfinityIcon className="h-5 w-5" />}
          title="Không giới hạn"
          desc="Làm bài bao nhiêu lần tùy thích, không giới hạn."
        />
        <Feature
          icon={<Smartphone className="h-5 w-5" />}
          title="Mọi thiết bị"
          desc="Giao diện responsive, tối ưu cho điện thoại."
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Thống kê của bạn</h2>
        {!activeProfile && (
          <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Chưa đăng nhập profile, thống kê chỉ là tạm thời cho phiên hiện tại.
          </p>
        )}
        <StatsPanel stats={stats} accuracy={accuracy} onReset={reset} />
      </section>
    </div>
  )
}
