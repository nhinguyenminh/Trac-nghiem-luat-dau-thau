import { Navigate, useParams } from "react-router-dom"
import QuizPage from "./QuizPage"

export default function PracticePage() {
  const { questionId } = useParams()
  const parsedId = Number(questionId)

  if (!questionId || Number.isNaN(parsedId) || !Number.isInteger(parsedId) || parsedId <= 0) {
    return <Navigate to="/quiz" replace />
  }

  return <QuizPage practiceQuestionId={parsedId} />
}
