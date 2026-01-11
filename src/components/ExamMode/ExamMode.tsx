import { useState, useEffect } from 'react';
import { Question } from '../../types/Question';
import { getExamQuestions } from '../../utils/questionLoader';
import QuestionCard from './QuestionCard';
import { QuestionNavigator } from './QuestionNavigator';
import { ExamResults } from './ExamResults';
import ConfirmationModal from './ConfirmationModal';
import ExamConfig, { ExamConfiguration } from './ExamConfig';
import { ErrorReportModal } from './ErrorReportModal';
import { QuestionReport } from '../../types/questions';
import { shuffleQuestionsOptions } from '../../utils/questionShuffler';
import { notify } from '../../store/notificationStore';

interface ExamModeProps {
  onExit: () => void;
}

export default function ExamMode({ onExit }: ExamModeProps) {
  const [showConfig, setShowConfig] = useState(true);
  const [examConfig, setExamConfig] = useState<ExamConfiguration | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number[]>>(new Map());
  const [dragDropAnswers, setDragDropAnswers] = useState<Map<string, { [itemIndex: number]: string }>>(new Map());
  const [matchingAnswers, setMatchingAnswers] = useState<Map<string, { [leftId: string]: string }>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(120 * 60); // Will be set by config
  const [examStarted, setExamStarted] = useState(false);
  const [examCompleted, setExamCompleted] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (examStarted && !examCompleted && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setExamCompleted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examStarted, examCompleted, timeRemaining]);

  const handleConfigSubmit = (config: ExamConfiguration) => {
    setExamConfig(config);
    setShowConfig(false);
    setTimeRemaining(config.totalTime * 60); // Convert minutes to seconds
  };

  const handleConfigCancel = () => {
    onExit();
  };

  const startExam = () => {
    try {
      console.log('Starting exam...');
      const allQuestions = getExamQuestions();
      console.log('Got exam questions:', allQuestions.length);

      if (!allQuestions || allQuestions.length === 0) {
        console.error('No exam questions available!');
        notify.error('Fehler: Keine Prüfungsfragen verfügbar. Bitte überprüfen Sie die Konsole für Details.');
        return;
      }

      if (!examConfig) {
        console.error('No exam config!');
        return;
      }

      // CCNA Exam topic distribution (exact percentages from real exam)
      const topicDistribution: { [key: string]: number } = {
        'Network Fundamentals': 0.20,
        'Network Access': 0.20,
        'IP Connectivity': 0.25,
        'IP Services': 0.10,
        'Security Fundamentals': 0.15,
        'Automation and Programmability': 0.10
      };

      // Group questions by topic
      const questionsByTopic: { [key: string]: Question[] } = {};
      allQuestions.forEach(q => {
        const topic = q.topic;
        if (!questionsByTopic[topic]) {
          questionsByTopic[topic] = [];
        }
        questionsByTopic[topic].push(q);
      });

      // Select questions based on distribution
      const selectedQuestions: Question[] = [];
      Object.entries(topicDistribution).forEach(([topic, percentage]) => {
        const questionsNeeded = Math.round(examConfig.questionCount * percentage);
        const availableQuestions = questionsByTopic[topic] || [];

        // Shuffle and take the needed amount
        const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(questionsNeeded, shuffled.length));

        selectedQuestions.push(...selected);
        console.log(`${topic}: ${selected.length}/${questionsNeeded} questions (available: ${availableQuestions.length})`);
      });

      // Final shuffle to mix up the order
      const finalQuestions = [...selectedQuestions].sort(() => Math.random() - 0.5);

      // Shuffle answer options for each question
      const shuffledQuestions = shuffleQuestionsOptions(finalQuestions);

      setQuestions(shuffledQuestions);
      setExamStarted(true);
      console.log('Exam started successfully with', finalQuestions.length, 'questions');
      console.log('Distribution:', Object.fromEntries(
        Object.entries(topicDistribution).map(([topic, pct]) => [
          topic,
          `${Math.round(examConfig.questionCount * pct)} (${Math.round(pct * 100)}%)`
        ])
      ));
    } catch (error) {
      console.error('Error starting exam:', error);
      notify.error('Fehler beim Starten der Prüfung: ' + (error as Error).message);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const currentQuestion = questions[currentQuestionIndex];
    const currentAnswers = answers.get(currentQuestion.id) || [];

    if (currentQuestion.type === 'multiple-choice-multiple') {
      const newAnswers = currentAnswers.includes(answerIndex)
        ? currentAnswers.filter(a => a !== answerIndex)
        : [...currentAnswers, answerIndex];
      setAnswers(new Map(answers.set(currentQuestion.id, newAnswers)));
    } else {
      setAnswers(new Map(answers.set(currentQuestion.id, [answerIndex])));
    }
  };

  const handleDragDropAnswerChange = (answer: { [itemIndex: number]: string }) => {
    const currentQuestion = questions[currentQuestionIndex];
    setDragDropAnswers(new Map(dragDropAnswers.set(currentQuestion.id, answer)));
  };

  const handleMatchingAnswerChange = (answer: { [leftId: string]: string }) => {
    const currentQuestion = questions[currentQuestionIndex];
    setMatchingAnswers(new Map(matchingAnswers.set(currentQuestion.id, answer)));
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitClick = () => {
    const unansweredCount = questions.length - answeredCount;

    if (unansweredCount > 0) {
      setShowSubmitConfirm(true);
    } else {
      setExamCompleted(true);
    }
  };

  const confirmSubmit = () => {
    setShowSubmitConfirm(false);
    setExamCompleted(true);
  };

  const cancelSubmit = () => {
    setShowSubmitConfirm(false);
  };

  const handleReportSubmit = (report: Omit<QuestionReport, 'id' | 'reportedAt' | 'status'>) => {
    const currentQuestion = questions[currentQuestionIndex];
    const fullReport: QuestionReport = {
      ...report,
      id: `report-${Date.now()}`,
      reportedAt: new Date(),
      status: 'pending',
      originalValue: (() => {
        if (report.target === 'question') return currentQuestion.question;
        if (report.target === 'option' && report.targetIndex !== undefined) {
          return currentQuestion.options[report.targetIndex];
        }
        if (report.target === 'answer') return currentQuestion.correctAnswer.join(',');
        if (report.target === 'explanation') return currentQuestion.explanation;
        return '';
      })()
    };

    // Save to localStorage
    const existingReports = JSON.parse(localStorage.getItem('questionReports') || '[]');
    localStorage.setItem('questionReports', JSON.stringify([...existingReports, fullReport]));

    notify.success('Fehler gemeldet! Vielen Dank für dein Feedback.');
    setShowReportModal(false);
  };


  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show configuration screen first
  if (showConfig) {
    return <ExamConfig onStart={handleConfigSubmit} onCancel={handleConfigCancel} />;
  }

  // Show exam start screen after config
  if (!examStarted && examConfig) {
    return (
      <div className="min-h-full relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-12 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 border border-white/20">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <span className="text-4xl">📝</span>
                </div>
                <h2 className="text-5xl font-black text-white">Practice Exam</h2>
              </div>
              <p className="text-xl text-white/90">CCNA 200-301 Certification</p>
            </div>

            <div className="space-y-6 mb-10">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">{examConfig.totalTime}</div>
                  <p className="text-white/80 font-semibold">Minutes</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-4xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">{examConfig.questionCount}</div>
                  <p className="text-white/80 font-semibold">Questions</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <p className="text-white/90 text-lg leading-relaxed">
                  This exam simulates the real CCNA exam experience with questions distributed across all exam topics.
                </p>
              </div>

              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border-l-4 border-yellow-400 rounded-2xl p-6">
                <p className="text-white font-medium">
                  <strong className="text-yellow-400">⚠ Note:</strong> Timer starts immediately after clicking "Start Exam".
                  Make sure you have enough time to complete the exam.
                </p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={startExam}
                className="group bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-black py-4 px-10 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center gap-3 text-lg"
              >
                <span>Start Exam</span>
                <span className="text-2xl group-hover:translate-x-2 transition-transform">→</span>
              </button>
              <button
                onClick={() => setShowConfig(true)}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-10 rounded-2xl border-2 border-white/30 hover:border-white/50 transition-all"
              >
                Change Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleRetake = () => {
    setExamCompleted(false);
    setExamStarted(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers(new Map());
    setTimeRemaining(120 * 60);
  };

  if (examCompleted && !reviewMode) {
    return (
      <ExamResults
        questions={questions}
        answers={answers}
        dragDropAnswers={dragDropAnswers}
        matchingAnswers={matchingAnswers}
        onExit={onExit}
        onReviewAnswers={(idx) => {
          setCurrentQuestionIndex(idx !== undefined ? idx : 0);
          setReviewMode(true);
        }}
        onRetake={handleRetake}
      />
    );
  }

  if (examCompleted && reviewMode) {
    // Review mode: Show questions with correct/incorrect indicators
    return (
      <div className="min-h-full relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        {/* Question Navigator with results */}
        <div className="relative z-10">
          <QuestionNavigator
            totalQuestions={questions.length}
            currentQuestion={currentQuestionIndex}
            answeredQuestions={new Set(questions.map((_, i) => i))}
            correctAnswers={new Map(questions.map((q, idx) => {
              let isCorrect = false;
              if (q.type === 'drag-and-drop' && q.dragDropData) {
                const dragAnswer = dragDropAnswers.get(q.id) || {};
                const dragAnswerEntries = Object.entries(dragAnswer);
                isCorrect = dragAnswerEntries.length > 0 && dragAnswerEntries.every(
                  ([itemIdx, categoryId]) => q.dragDropData!.correctMapping[parseInt(itemIdx)] === categoryId
                );
              } else if (q.type === 'matching' && q.matchingData) {
                const matchAnswer = matchingAnswers.get(q.id) || {};
                const matchAnswerEntries = Object.entries(matchAnswer);
                isCorrect = matchAnswerEntries.length > 0 && matchAnswerEntries.every(
                  ([leftId, rightId]) => q.matchingData!.correctMatches[leftId] === rightId
                );
              } else {
                const userAnswer = answers.get(q.id) || [];
                // CRITICAL FIX: Empty answer is NEVER correct
                isCorrect = userAnswer.length > 0 &&
                           userAnswer.length === q.correctAnswer.length &&
                           userAnswer.every(a => q.correctAnswer.includes(a));
              }
              return [idx, isCorrect];
            }))}
            onNavigate={(idx) => setCurrentQuestionIndex(idx)}
            isSubmitted={true}
          />
        </div>

        {/* Question with explanation */}
        <div className="relative z-10 p-8 max-w-5xl mx-auto overflow-y-auto flex-1">
          <QuestionCard
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            selectedAnswers={answers.get(questions[currentQuestionIndex]?.id) || []}
            onAnswerSelect={() => {}} // Read-only
            showExplanation={true}
            dragDropAnswer={dragDropAnswers.get(questions[currentQuestionIndex]?.id) || {}}
            onDragDropAnswerChange={() => {}} // Read-only
            matchingAnswer={matchingAnswers.get(questions[currentQuestionIndex]?.id) || {}}
            onMatchingAnswerChange={() => {}} // Read-only
          />

          <div className="flex justify-between mt-8">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(currentQuestionIndex - 1);
                  }
                }}
                disabled={currentQuestionIndex === 0}
                className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-2xl border-2 border-white/30 hover:border-white/50 transition-all disabled:cursor-not-allowed"
              >
                ← Vorherige
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm text-white font-bold py-4 px-6 rounded-2xl border-2 border-red-400/30 hover:border-red-400/50 transition-all"
                title="Fehler bei dieser Frage melden"
              >
                🚨 Fehler melden
              </button>
            </div>

            <button
              onClick={() => setReviewMode(false)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              Zurück zu Ergebnissen
            </button>

            <button
              onClick={() => {
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                }
              }}
              disabled={currentQuestionIndex === questions.length - 1}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-300 disabled:hover:scale-100"
            >
              Nächste →
            </button>
          </div>
        </div>

        {/* Error Report Modal */}
        {showReportModal && (
          <ErrorReportModal
            questionId={questions[currentQuestionIndex].id}
            questionNumber={currentQuestionIndex + 1}
            onClose={() => setShowReportModal(false)}
            onSubmit={handleReportSubmit}
          />
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswers = answers.get(currentQuestion?.id) || [];
  const answeredCount = Array.from(answers.values()).filter(a => a.length > 0).length;

  // Get set of answered question indexes
  const answeredQuestions = new Set<number>();
  questions.forEach((q, idx) => {
    if (answers.get(q.id)?.length) {
      answeredQuestions.add(idx);
    }
  });

  const handleNavigate = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  // Check if current question is fully answered
  const isQuestionFullyAnswered = (): boolean => {
    if (!currentQuestion) return false;

    switch (currentQuestion.type) {
      case 'multiple-choice-single':
      case 'true-false':
        return currentAnswers.length === 1;

      case 'multiple-choice-multiple':
        // Must select exactly the required number of answers
        return currentAnswers.length === currentQuestion.correctAnswer.length;

      case 'drag-and-drop':
        if (!currentQuestion.dragDropData) return false;
        const dragAnswer = dragDropAnswers.get(currentQuestion.id) || {};
        // All items must be placed
        return Object.keys(dragAnswer).length === currentQuestion.dragDropData.items.length;

      case 'matching':
        if (!currentQuestion.matchingData) return false;
        const matchAnswer = matchingAnswers.get(currentQuestion.id) || {};
        // All left items must be matched
        return Object.keys(matchAnswer).length === currentQuestion.matchingData.leftColumn.length;

      case 'ordering':
        // TODO: Implement when ordering questions are used
        return true;

      default:
        return currentAnswers.length > 0;
    }
  };

  const canGoNext = isQuestionFullyAnswered();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10">
        {/* Question Navigator */}
        <QuestionNavigator
          totalQuestions={questions.length}
          currentQuestion={currentQuestionIndex}
          answeredQuestions={answeredQuestions}
          onNavigate={handleNavigate}
          isSubmitted={false}
        />

        <div className="p-8 max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-xl text-white rounded-2xl p-6 mb-8 flex justify-between items-center border border-white/20 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">⏱</span>
              </div>
              <div>
                <div className="text-sm text-white/80 font-semibold">Time Remaining</div>
                <div className="text-2xl font-black">{formatTime(timeRemaining)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/80 font-semibold">Progress</div>
              <div className="text-2xl font-black">
                {answeredCount} / {questions.length}
              </div>
            </div>
          </div>

          <QuestionCard
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          selectedAnswers={currentAnswers}
          onAnswerSelect={handleAnswerSelect}
          dragDropAnswer={dragDropAnswers.get(currentQuestion?.id) || {}}
          onDragDropAnswerChange={handleDragDropAnswerChange}
          matchingAnswer={matchingAnswers.get(currentQuestion?.id) || {}}
          onMatchingAnswerChange={handleMatchingAnswerChange}
        />

          <div className="flex justify-between mt-8">
            <div className="flex gap-3">
              <button
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0}
                className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-2xl border-2 border-white/30 hover:border-white/50 transition-all disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={() => setShowReportModal(true)}
                className="bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm text-white font-bold py-4 px-6 rounded-2xl border-2 border-red-400/30 hover:border-red-400/50 transition-all"
                title="Fehler bei dieser Frage melden"
              >
                🚨 Fehler melden
              </button>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleSubmitClick}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-black py-4 px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
              >
                Submit Exam
              </button>
              <button
                onClick={goToNext}
                disabled={currentQuestionIndex === questions.length - 1 || !canGoNext}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-black py-4 px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:hover:scale-100"
                title={!canGoNext ? 'Bitte beantworte die Frage vollständig' : ''}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <ConfirmationModal
          title="Prüfung abgeben?"
          message={`Sie haben ${questions.length - answeredCount} von ${questions.length} Fragen nicht beantwortet.\n\nMöchten Sie die Prüfung wirklich abgeben?`}
          confirmText="Ja, abgeben"
          cancelText="Nein, zurück"
          variant="warning"
          onConfirm={confirmSubmit}
          onCancel={cancelSubmit}
        />
      )}

      {/* Error Report Modal */}
      {showReportModal && (
        <ErrorReportModal
          questionId={currentQuestion.id}
          questionNumber={currentQuestionIndex + 1}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}
