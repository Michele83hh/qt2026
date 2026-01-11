import { useState, useEffect } from 'react';
import { Question, Topic } from '../../types/Question';
import { getQuestionsByTopic, allQuestions } from '../../utils/questionLoader';
import QuestionCard from '../ExamMode/QuestionCard';
import { ErrorReportModal } from '../ExamMode/ErrorReportModal';
import { QuestionReport } from '../../types/questions';
import { shuffleQuestionsOptions } from '../../utils/questionShuffler';
import { notify } from '../../store/notificationStore';
import { getExpectedAnswerCount } from '../../utils/questionHelpers';

interface PracticeModeProps {
  onExit: () => void;
}

type PracticeMode = 'select' | 'random' | 'topics';

export default function PracticeMode({ onExit }: PracticeModeProps) {
  const [mode, setMode] = useState<PracticeMode>('select');
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [isUnlimited, setIsUnlimited] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Store answers per question ID
  const [allAnswers, setAllAnswers] = useState<Map<string, number[]>>(new Map());
  const [allDragDropAnswers, setAllDragDropAnswers] = useState<Map<string, { [itemIndex: number]: string }>>(new Map());
  const [allMatchingAnswers, setAllMatchingAnswers] = useState<Map<string, { [leftId: string]: string }>>(new Map());
  const [showExplanation, setShowExplanation] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  // Get current question's answers
  const currentQuestion = questions[currentQuestionIndex];
  const selectedAnswers = currentQuestion ? (allAnswers.get(currentQuestion.id) || []) : [];
  const dragDropAnswer = currentQuestion ? (allDragDropAnswers.get(currentQuestion.id) || {}) : {};
  const matchingAnswer = currentQuestion ? (allMatchingAnswers.get(currentQuestion.id) || {}) : {};
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const topics: Topic[] = [
    'Network Fundamentals',
    'Network Access',
    'IP Connectivity',
    'IP Services',
    'Security Fundamentals',
    'Automation and Programmability',
  ];

  // Timer
  useEffect(() => {
    if (!practiceStarted || isUnlimited) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [practiceStarted, isUnlimited]);

  // Separate effect to handle practice end
  useEffect(() => {
    if (timeRemaining === 0 && practiceStarted && !isUnlimited) {
      endPractice();
    }
  }, [timeRemaining, practiceStarted, isUnlimited]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!practiceStarted) return;

      if (e.key === 'Enter' && showExplanation) {
        nextQuestion();
      } else if (e.key === 'ArrowRight' && showExplanation) {
        nextQuestion();
      } else if (e.key === 'ArrowLeft') {
        previousQuestion();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showExplanation, currentQuestionIndex, questions.length, practiceStarted, answeredQuestions]);

  const handleModeSelect = (selectedMode: 'random' | 'topics') => {
    setMode(selectedMode);
    setTimeMinutes(30);
    setSelectedTopics([]);
  };

  const toggleTopic = (topic: Topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const startPractice = () => {
    let practiceQuestions: Question[] = [];

    if (mode === 'random') {
      // Random mode: all questions shuffled
      practiceQuestions = [...allQuestions].sort(() => Math.random() - 0.5);
    } else if (mode === 'topics') {
      // Topic mode: selected topics shuffled
      if (selectedTopics.length === 0) return;
      practiceQuestions = selectedTopics
        .flatMap(topic => getQuestionsByTopic(topic))
        .sort(() => Math.random() - 0.5);
    }

    // Shuffle answer options for each question
    const shuffledQuestions = shuffleQuestionsOptions(practiceQuestions);

    setQuestions(shuffledQuestions);
    setTimeRemaining(timeMinutes * 60);
    setPracticeStarted(true);
    setCurrentQuestionIndex(0);
    setAllAnswers(new Map());
    setAllDragDropAnswers(new Map());
    setAllMatchingAnswers(new Map());
    setAnsweredQuestions(new Set());
    setShowExplanation(false);
    setStats({ correct: 0, incorrect: 0 });
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.id;

    setAllAnswers(prev => {
      const newMap = new Map(prev);
      const currentAnswers = newMap.get(questionId) || [];

      if (currentQuestion.type === 'multiple-choice-multiple') {
        if (currentAnswers.includes(answerIndex)) {
          newMap.set(questionId, currentAnswers.filter(a => a !== answerIndex));
        } else {
          newMap.set(questionId, [...currentAnswers, answerIndex]);
        }
      } else {
        newMap.set(questionId, [answerIndex]);
      }
      return newMap;
    });
  };

  const handleDragDropChange = (answer: { [itemIndex: number]: string }) => {
    if (!currentQuestion) return;
    setAllDragDropAnswers(prev => {
      const newMap = new Map(prev);
      newMap.set(currentQuestion.id, answer);
      return newMap;
    });
  };

  const handleMatchingChange = (answer: { [leftId: string]: string }) => {
    if (!currentQuestion) return;
    setAllMatchingAnswers(prev => {
      const newMap = new Map(prev);
      newMap.set(currentQuestion.id, answer);
      return newMap;
    });
  };

  const checkAnswer = () => {
    if (!currentQuestion) return;

    // Only count if not already answered
    if (answeredQuestions.has(currentQuestionIndex)) {
      setShowExplanation(true);
      return;
    }

    let isCorrect = false;

    if (currentQuestion.type === 'drag-and-drop' && currentQuestion.dragDropData) {
      isCorrect = Object.entries(dragDropAnswer).every(
        ([itemIdx, categoryId]) => currentQuestion.dragDropData!.correctMapping[parseInt(itemIdx)] === categoryId
      ) && Object.keys(dragDropAnswer).length === currentQuestion.dragDropData.items.length;
    } else if (currentQuestion.type === 'matching' && currentQuestion.matchingData) {
      isCorrect = Object.entries(matchingAnswer).every(
        ([leftId, rightId]) => currentQuestion.matchingData!.correctMatches[leftId] === rightId
      ) && Object.keys(matchingAnswer).length === currentQuestion.matchingData.leftColumn.length;
    } else {
      isCorrect =
        selectedAnswers.length === currentQuestion.correctAnswer.length &&
        selectedAnswers.every(a => currentQuestion.correctAnswer.includes(a));
    }

    setStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1),
    }));
    setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      // Check if next question was already answered
      setShowExplanation(answeredQuestions.has(currentQuestionIndex + 1));
    } else {
      endPractice();
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Show explanation if question was already answered
      setShowExplanation(answeredQuestions.has(currentQuestionIndex - 1));
    }
  };

  const endPractice = () => {
    const accuracy = stats.correct + stats.incorrect > 0
      ? Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)
      : 0;
    notify.success(`Practice Completed!\n\nCorrect: ${stats.correct}\nIncorrect: ${stats.incorrect}\nAccuracy: ${accuracy}%`);
    resetPractice();
  };

  const resetPractice = () => {
    setMode('select');
    setPracticeStarted(false);
    setStats({ correct: 0, incorrect: 0 });
    setQuestions([]);
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
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Mode Selection Screen
  if (mode === 'select') {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-4xl w-full">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 border border-white/20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <span className="text-4xl">📚</span>
                </div>
                <h2 className="text-5xl font-black text-white">Practice Mode</h2>
              </div>
              <p className="text-xl text-white/90">Choose your practice mode</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Random Mode */}
              <button
                onClick={() => handleModeSelect('random')}
                className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 text-left shadow-xl"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🎲</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Random Mode</h3>
                <p className="text-white/70">Practice with random questions from all topics. Set your time and go!</p>
                <div className="mt-4 px-4 py-2 bg-purple-500/20 rounded-xl border border-purple-400/30 inline-block">
                  <span className="text-white font-bold">{allQuestions.length} Questions Available</span>
                </div>
              </button>

              {/* Topic Selection Mode */}
              <button
                onClick={() => handleModeSelect('topics')}
                className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 text-left shadow-xl"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🎯</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Topic Selection</h3>
                <p className="text-white/70">Choose specific topics to focus on. Perfect for targeted practice!</p>
                <div className="mt-4 px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30 inline-block">
                  <span className="text-white font-bold">{topics.length} Topics Available</span>
                </div>
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={onExit}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-10 rounded-2xl border-2 border-white/30 hover:border-white/50 transition-all"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Random Mode Config
  if (mode === 'random' && !practiceStarted) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-2xl w-full">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 border border-white/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-4">
                <span className="text-4xl">🎲</span>
              </div>
              <h2 className="text-4xl font-black text-white mb-2">Random Mode</h2>
              <p className="text-white/80">Set your practice time</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-white font-bold mb-3">Practice Time</label>

                {/* Unlimited Toggle */}
                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer mb-4 border border-white/20 hover:border-white/30 transition-all">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => setIsUnlimited(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-white font-semibold">♾️ Unlimited (keine Zeitbegrenzung)</span>
                </label>

                {!isUnlimited && (
                  <>
                    <div className="flex gap-4 items-center">
                      <input
                        type="range"
                        min="5"
                        max="180"
                        step="5"
                        value={timeMinutes}
                        onChange={(e) => setTimeMinutes(parseInt(e.target.value))}
                        className="flex-1 h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                      <input
                        type="number"
                        min="5"
                        max="180"
                        value={timeMinutes}
                        onChange={(e) => setTimeMinutes(parseInt(e.target.value))}
                        className="w-24 px-4 py-2 bg-white/20 text-white rounded-xl border border-white/30 focus:border-white/60 focus:outline-none font-bold text-center"
                      />
                    </div>
                    <p className="text-white/60 text-sm mt-2">
                      Estimated questions: ~{timeMinutes} (1 min average per question)
                    </p>
                  </>
                )}
              </div>

              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <p className="text-white/80">
                  <strong className="text-white">All {allQuestions.length} questions</strong> from all topics will be randomly shuffled. {isUnlimited ? 'Practice as long as you want!' : 'Practice until time runs out!'}
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setMode('select')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-xl border border-white/30 transition-all"
              >
                Back
              </button>
              <button
                onClick={startPractice}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black py-4 px-6 rounded-xl shadow-xl transform hover:scale-105 transition-all"
              >
                Start Practice
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Topic Selection Config
  if (mode === 'topics' && !practiceStarted) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-4xl w-full">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 border border-white/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-4">
                <span className="text-4xl">🎯</span>
              </div>
              <h2 className="text-4xl font-black text-white mb-2">Topic Selection</h2>
              <p className="text-white/80">Choose topics and set your time</p>
            </div>

            <div className="space-y-6">
              {/* Topic Selection */}
              <div>
                <label className="block text-white font-bold mb-3">Select Topics</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {topics.map((topic, idx) => {
                    const isSelected = selectedTopics.includes(topic);
                    const colors = [
                      'from-blue-500 to-cyan-500',
                      'from-purple-500 to-pink-500',
                      'from-emerald-500 to-teal-500',
                      'from-orange-500 to-amber-500',
                      'from-red-500 to-rose-500',
                      'from-indigo-500 to-violet-500',
                    ];
                    const color = colors[idx];

                    return (
                      <button
                        key={topic}
                        onClick={() => toggleTopic(topic)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? `bg-gradient-to-r ${color} border-white/50 shadow-xl scale-105`
                            : 'bg-white/5 border-white/20 hover:border-white/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-bold ${isSelected ? 'text-white' : 'text-white/80'}`}>
                            {topic}
                          </span>
                          <span className={`text-sm px-2 py-1 rounded-lg ${
                            isSelected ? 'bg-white/30' : 'bg-white/10'
                          }`}>
                            <span className="text-white font-bold">{getQuestionsByTopic(topic).length}Q</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-white/60 text-sm mt-2">
                  {selectedTopics.length === 0 ? 'Select at least one topic' : `${selectedTopics.length} topic(s) selected`}
                </p>
              </div>

              {/* Time Selection */}
              <div>
                <label className="block text-white font-bold mb-3">Practice Time</label>

                {/* Unlimited Toggle */}
                <label className="flex items-center gap-3 p-4 bg-white/5 rounded-xl cursor-pointer mb-4 border border-white/20 hover:border-white/30 transition-all">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => setIsUnlimited(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="text-white font-semibold">♾️ Unlimited (keine Zeitbegrenzung)</span>
                </label>

                {!isUnlimited && (
                  <div className="flex gap-4 items-center">
                    <input
                      type="range"
                      min="5"
                      max="180"
                      step="5"
                      value={timeMinutes}
                      onChange={(e) => setTimeMinutes(parseInt(e.target.value))}
                      className="flex-1 h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    />
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={timeMinutes}
                      onChange={(e) => setTimeMinutes(parseInt(e.target.value))}
                      className="w-24 px-4 py-2 bg-white/20 text-white rounded-xl border border-white/30 focus:border-white/60 focus:outline-none font-bold text-center"
                    />
                  </div>
                )}
              </div>

              {selectedTopics.length > 0 && (
                <div className="bg-emerald-500/20 rounded-2xl p-4 border border-emerald-400/30">
                  <p className="text-white/90 text-sm">
                    <strong className="text-white">
                      {selectedTopics.reduce((sum, topic) => sum + getQuestionsByTopic(topic).length, 0)} questions
                    </strong> available from selected topics
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setMode('select')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-xl border border-white/30 transition-all"
              >
                Back
              </button>
              <button
                onClick={startPractice}
                disabled={selectedTopics.length === 0}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-black py-4 px-6 rounded-xl shadow-xl transform hover:scale-105 transition-all disabled:hover:scale-100"
              >
                Start Practice
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Practice Session - currentQuestion is already defined above
  if (!currentQuestion) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Error loading question</h2>
          <button
            onClick={resetPractice}
            className="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-xl font-bold"
          >
            Back to Mode Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full relative overflow-auto bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative z-10 p-8 max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 backdrop-blur-xl text-white rounded-2xl p-6 mb-8 border border-white/20 shadow-2xl">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">📚</span>
              </div>
              <div>
                <div className="text-sm text-white/80 font-semibold">Practice Mode</div>
                <div className="text-xl font-black">{mode === 'random' ? 'Random' : 'Topic Selection'}</div>
              </div>
            </div>
            <div className="flex gap-4 text-center flex-wrap">
              {!isUnlimited && (
                <div className={`px-4 py-2 rounded-xl border ${
                  timeRemaining < 300 ? 'bg-red-500/20 border-red-400/30' : 'bg-cyan-500/20 border-cyan-400/30'
                }`}>
                  <div className={`text-2xl font-black ${timeRemaining < 300 ? 'text-red-400' : 'text-cyan-400'}`}>
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-xs text-white/80">Time</div>
                </div>
              )}
              <div className="bg-green-500/20 px-4 py-2 rounded-xl border border-green-400/30">
                <div className="text-2xl font-black text-green-400">{stats.correct}</div>
                <div className="text-xs text-white/80">Correct</div>
              </div>
              <div className="bg-red-500/20 px-4 py-2 rounded-xl border border-red-400/30">
                <div className="text-2xl font-black text-red-400">{stats.incorrect}</div>
                <div className="text-xs text-white/80">Incorrect</div>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                <div className="text-2xl font-black">{currentQuestionIndex + 1}/{questions.length}</div>
                <div className="text-xs text-white/80">Question</div>
              </div>
            </div>
          </div>
        </div>

        <QuestionCard
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          selectedAnswers={selectedAnswers}
          onAnswerSelect={handleAnswerSelect}
          showExplanation={showExplanation}
          dragDropAnswer={dragDropAnswer}
          onDragDropAnswerChange={handleDragDropChange}
          matchingAnswer={matchingAnswer}
          onMatchingAnswerChange={handleMatchingChange}
        />

        <div className="flex justify-between items-center mt-8">
          <div className="flex gap-3">
            <button
              onClick={resetPractice}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-2xl border-2 border-white/30 hover:border-white/50 transition-all"
            >
              ← End Practice
            </button>
            <button
              onClick={previousQuestion}
              disabled={currentQuestionIndex === 0}
              className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/40 disabled:cursor-not-allowed backdrop-blur-sm text-white font-bold py-4 px-6 rounded-2xl border-2 border-white/30 hover:border-white/50 disabled:border-white/10 transition-all"
              title="Zur vorherigen Frage"
            >
              ← Zurück
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="bg-red-500/20 hover:bg-red-500/30 backdrop-blur-sm text-white font-bold py-4 px-6 rounded-2xl border-2 border-red-400/30 hover:border-red-400/50 transition-all"
              title="Fehler bei dieser Frage melden"
            >
              🚨 Fehler melden
            </button>
          </div>
          {!showExplanation ? (
            <button
              onClick={checkAnswer}
              disabled={(() => {
                if (currentQuestion.type === 'drag-and-drop' && currentQuestion.dragDropData) {
                  return Object.keys(dragDropAnswer).length < currentQuestion.dragDropData.items.length;
                } else if (currentQuestion.type === 'matching' && currentQuestion.matchingData) {
                  return Object.keys(matchingAnswer).length < currentQuestion.matchingData.leftColumn.length;
                } else if (currentQuestion.type === 'multiple-choice-multiple') {
                  const expectedCount = getExpectedAnswerCount(currentQuestion.question);
                  if (expectedCount !== null) {
                    return selectedAnswers.length !== expectedCount;
                  }
                  return selectedAnswers.length === 0;
                } else {
                  return selectedAnswers.length === 0;
                }
              })()}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-gray-400 disabled:to-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:hover:scale-100 disabled:shadow-none"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={nextQuestion}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-black py-4 px-8 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Next Question →
            </button>
          )}
        </div>
      </div>

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
