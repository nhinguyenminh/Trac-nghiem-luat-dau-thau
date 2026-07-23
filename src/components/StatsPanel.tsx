import { ListChecks, CheckCircle2, XCircle, Percent, RotateCcw } from "lucide-react"
import type { Stats } from "../types"

interface StatsPanelProps {
  stats: Stats
  accuracy: number
  onReset: () => void
  resetLabel?: string
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-3 text-center shadow-sm">
      <div className={`mb-1 ${accent}`}>{icon}</div>
      <div className="text-xl font-bold text-slate-800 sm:text-2xl">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

export default function StatsPanel({ stats, accuracy, onReset, resetLabel = "Reset kết quả" }: StatsPanelProps) {
  return (
    <section aria-label="Thống kê kết quả">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<ListChecks className="h-5 w-5" />}
          label="Đã làm"
          value={stats.total}
          accent="text-ms-blue"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Đúng"
          value={stats.correct}
          accent="text-ms-green"
        />
        <StatCard
          icon={<XCircle className="h-5 w-5" />}
          label="Sai"
          value={stats.wrong}
          accent="text-ms-red"
        />
        <StatCard
          icon={<Percent className="h-5 w-5" />}
          label="Chính xác"
          value={`${accuracy}%`}
          accent="text-ms-blue-dark"
        />
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-ms-blue transition-all duration-500"
            style={{ width: `${accuracy}%` }}
          />
        </div>
      </div>

      <button
        onClick={onReset}
        disabled={stats.total === 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <RotateCcw className="h-4 w-4" />
        {resetLabel}
      </button>
    </section>
  )
}
