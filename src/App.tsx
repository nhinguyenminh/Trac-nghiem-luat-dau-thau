import { Routes, Route, Link, useLocation } from "react-router-dom"
import { GraduationCap } from "lucide-react"
import HomePage from "./pages/HomePage"
import QuizPage from "./pages/QuizPage"

function Header() {
  const { pathname } = useLocation()
  return (
    <header className="bg-ms-blue text-white shadow-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-6 w-6" strokeWidth={2} />
          <span className="text-base sm:text-lg">Luyện Thi Chứng Chỉ Đấu Thầu</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/"
            className={`rounded-md px-3 py-1.5 transition-colors ${
              pathname === "/" ? "bg-white/20" : "hover:bg-white/10"
            }`}
          >
            Trang chủ
          </Link>
          <Link
            to="/quiz"
            className={`rounded-md px-3 py-1.5 transition-colors ${
              pathname === "/quiz" ? "bg-white/20" : "hover:bg-white/10"
            }`}
          >
            Luyện thi
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default function App() {
  return (
    <div className="flex min-h-full flex-col bg-slate-50 text-slate-800">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/quiz" element={<QuizPage />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Ứng dụng luyện thi chứng chỉ đấu thầu &middot; Làm bài không giới hạn
      </footer>
    </div>
  )
}
