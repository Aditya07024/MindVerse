import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPlay, FiClock, FiAward } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import api from "../../utils/api";
import Loading from "../../components/Loading/Loading";

export default function Quiz() {
  const { fileId } = useParams(); // 👈 from route
  const [quizzes, setQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(false);

  /* ================= FETCH QUIZZES ================= */
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/quiz");
        setQuizzes(res.data || []);
      } catch {
        toast.error("Failed to load quizzes");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  /* ================= TIMER ================= */
  useEffect(() => {
    if (!currentQuiz || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, currentQuiz]);

  /* ================= START QUIZ ================= */
  const startQuiz = async (quizId) => {
    try {
      setQuizLoading(true);
      const res = await api.post(`/quiz/${quizId}/start`);
      setCurrentQuiz(res.data);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setAnswers([]);
      setScore(null);
      setTimeLeft(res.data.duration * 60);
    } catch {
      toast.error("Failed to start quiz");
    } finally {
      setQuizLoading(false);
    }
  };

  /* ================= ANSWERS ================= */
  const handleNext = () => {
    if (selectedAnswer === null) {
      toast.error("Select an answer");
      return;
    }

    const updated = [...answers, selectedAnswer];
    setAnswers(updated);
    setSelectedAnswer(null);

    if (currentQuestion < currentQuiz.questions.length - 1) {
      setCurrentQuestion((p) => p + 1);
    } else {
      submitQuiz(updated);
    }
  };

  const submitQuiz = async (finalAnswers) => {
    try {
      const res = await api.post(`/quiz/${currentQuiz._id}/submit`, {
        answers: finalAnswers,
      });
      setScore(res.data);
      setCurrentQuiz(null);
    } catch {
      toast.error("Failed to submit quiz");
    }
  };

  /* ================= UI STATES ================= */

  if (loading) return <Loading />;

  /* ===== SCORE PAGE ===== */
  if (score) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex justify-center items-center">
        <div className="bg-white rounded-xl shadow p-8 w-full max-w-lg text-center">
          <FiAward className="text-yellow-500 w-14 h-14 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Quiz Completed</h2>

          <p className="text-lg mb-2">
            Score: <b>{score.score}/{score.total}</b>
          </p>

          <p className="text-green-600 font-semibold">
            Accuracy: {score.accuracy}%
          </p>

          <div className="mt-6 flex gap-3 justify-center">
            <button
              onClick={() => setScore(null)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Try Again
            </button>

            <Link
              to="/leaderboard"
              className="px-4 py-2 bg-gray-700 text-white rounded"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ===== QUIZ ACTIVE ===== */
  if (currentQuiz) {
    const question = currentQuiz.questions[currentQuestion];

    return (
      <div className="min-h-screen bg-gray-100 p-6 flex justify-center">
        <div className="max-w-3xl w-full bg-white rounded-lg shadow p-6">
          <div className="flex justify-between mb-4">
            <h2 className="font-bold text-lg">{currentQuiz.title}</h2>
            <span className="text-red-500 flex items-center gap-1">
              <FiClock /> {Math.max(timeLeft, 0)}s
            </span>
          </div>

          <p className="mb-4 text-gray-700">
            Question {currentQuestion + 1} / {currentQuiz.questions.length}
          </p>

          <h3 className="font-semibold mb-4">{question.question}</h3>

          <div className="space-y-3">
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelectedAnswer(i)}
                className={`w-full text-left p-3 rounded border transition ${
                  selectedAnswer === i
                    ? "bg-blue-100 border-blue-500"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="mt-6 w-full bg-blue-600 text-white py-2 rounded"
          >
            {currentQuestion + 1 === currentQuiz.questions.length
              ? "Submit Quiz"
              : "Next"}
          </button>
        </div>
      </div>
    );
  }

  /* ===== QUIZ LIST ===== */
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Quizzes</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz._id}
              className="bg-white rounded-lg shadow p-5"
            >
              <h3 className="font-semibold text-lg mb-2">{quiz.title}</h3>
              <p className="text-gray-600 mb-3">{quiz.description}</p>

              <div className="flex justify-between items-center text-sm mb-3">
                <span className="flex items-center gap-1">
                  <FiClock /> {quiz.duration} min
                </span>
                <span>{quiz.questions.length} questions</span>
              </div>

              <button
                onClick={() => startQuiz(quiz._id)}
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                <FiPlay className="inline mr-2" />
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}