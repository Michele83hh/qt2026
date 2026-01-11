import { useState, useEffect } from 'react';
import { Question, Topic } from '../../types/Question';
import {
  SmartPracticeHistory,
  ReviewQuality,
  SmartPracticeSession
} from '../../types/SmartPractice';
import {
  calculateNextReview,
  createNewCard,
  getDueQuestions,
  getSmartPracticeStats,
  createEmptyHistory
} from '../../utils/smartPracticeAlgorithm';

interface SmartPracticeProps {
  onExit: () => void;
}

type ViewMode = 'select' | 'config' | 'stats' | 'question' | 'answer';
type PracticeMode = 'random' | 'topics';

const STORAGE_KEY = 'smart-practice-history';

export default function SmartPractice({ onExit }: SmartPracticeProps) {
  const [history, setHistory] = useState<SmartPracticeHistory>(createEmptyHistory());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [dueQuestionIds, setDueQuestionIds] = useState<string[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<SmartPracticeSession | null>(null);
  const [completedSession, setCompletedSession] = useState<SmartPracticeSession | null>(null);
  const [userAnswer, setUserAnswer] = useState<string | string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('select');
  const [loading, setLoading] = useState(true);

  // Configuration
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('random');
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);

  const topics: Topic[] = [
    'Network Fundamentals',
    'Network Access',
    'IP Connectivity',
    'IP Services',
    'Security Fundamentals',
    'Automation and Programmability',
  ];

  // Load questions and history
  useEffect(() => {
    loadData();
  }, []);

  // Timer
  useEffect(() => {
    if (!sessionStarted || isUnlimited || timeRemaining === 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStarted, timeRemaining, isUnlimited]);

  const loadData = async () => {
    try {
      const isTauri = '__TAURI_INTERNALS__' in window;
      let data: any;

      if (isTauri) {
        const { invoke } = await import('@tauri-apps/api/core');
        const questionsJson = await invoke<string>('read_questions');
        data = JSON.parse(questionsJson);
      } else {
        const response = await fetch('/src/data/questions.json');
        data = await response.json();
      }

      setAllQuestions(data.questions || []);

      // Load history from localStorage
      const savedHistory = localStorage.getItem(STORAGE_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const saveHistory = (newHistory: SmartPracticeHistory) => {
    setHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  };

  const handleModeSelect = (mode: PracticeMode) => {
    setPracticeMode(mode);
    setViewMode('config');
  };

  const toggleTopic = (topic: Topic) => {
    setSelectedTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const startSession = () => {
    let practiceQuestions: Question[] = [];

    if (practiceMode === 'random') {
      practiceQuestions = [...allQuestions];
    } else {
      if (selectedTopics.length === 0) return;
      practiceQuestions = allQuestions.filter(q => selectedTopics.includes(q.topic as Topic));
    }

    // Get due questions
    const allQuestionIds = practiceQuestions.map(q => q.id);
    const due = getDueQuestions(allQuestionIds, history);

    if (due.length === 0) {
      alert('Keine Fragen fällig! Komm später wieder. 🎉');
      return;
    }

    // Filter to only include questions that are in practiceQuestions
    const availableQuestions = practiceQuestions.filter(q => due.includes(q.id));
    setQuestions(availableQuestions);
    setDueQuestionIds(due.filter(id => availableQuestions.some(q => q.id === id)));

    if (availableQuestions.length > 0) {
      setCurrentQuestionId(availableQuestions[0].id);
    }

    setCurrentSession({
      startTime: Date.now(),
      questionsReviewed: 0,
      correctAnswers: 0,
      incorrectAnswers: 0
    });

    if (!isUnlimited) {
      setTimeRemaining(timeMinutes * 60);
    }

    setCompletedSession(null); // Reset previous session summary
    setSessionStarted(true);
    setViewMode('question');
    setUserAnswer([]);
  };

  const getCurrentQuestion = (): Question | null => {
    if (!currentQuestionId) return null;
    return questions.find(q => q.id === currentQuestionId) || null;
  };

  const handleAnswer = () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    // Check if answer is correct
    // userAnswer stores option TEXT, correctAnswer stores option INDICES
    let isCorrect = false;
    if (currentQuestion.type === 'multiple-choice-single') {
      // Find the index of the selected option text
      const selectedIndex = currentQuestion.options.indexOf(userAnswer as string);
      isCorrect = currentQuestion.correctAnswer.length === 1 &&
                  currentQuestion.correctAnswer[0] === selectedIndex;
    } else if (currentQuestion.type === 'multiple-choice-multiple') {
      // Convert selected option texts to indices
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
      const selectedIndices = userAnswers
        .map(text => currentQuestion.options.indexOf(text))
        .filter(idx => idx !== -1)
        .sort((a, b) => a - b);
      const correctIndices = [...(currentQuestion.correctAnswer || [])].sort((a, b) => a - b);
      isCorrect = selectedIndices.length === correctIndices.length &&
                  selectedIndices.every((idx, i) => idx === correctIndices[i]);
    }

    // Update session
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        questionsReviewed: currentSession.questionsReviewed + 1,
        correctAnswers: isCorrect ? currentSession.correctAnswers + 1 : currentSession.correctAnswers,
        incorrectAnswers: !isCorrect ? currentSession.incorrectAnswers + 1 : currentSession.incorrectAnswers
      });
    }

    setViewMode('answer');
  };

  const rateAnswer = (quality: ReviewQuality) => {
    if (!currentQuestionId) return;

    // Get or create card
    let card = history.cards[currentQuestionId];
    if (!card) {
      card = createNewCard(currentQuestionId);
    }

    // Update card with SM-2 algorithm
    const updatedCard = calculateNextReview(card, quality);

    // Update history
    const newHistory: SmartPracticeHistory = {
      ...history,
      cards: {
        ...history.cards,
        [currentQuestionId]: updatedCard
      },
      totalQuestionsReviewed: history.totalQuestionsReviewed + 1,
      totalCorrect: quality >= ReviewQuality.GOOD ? history.totalCorrect + 1 : history.totalCorrect,
      totalIncorrect: quality < ReviewQuality.GOOD ? history.totalIncorrect + 1 : history.totalIncorrect
    };

    saveHistory(newHistory);

    // Move to next question
    const currentIndex = dueQuestionIds.indexOf(currentQuestionId);
    if (currentIndex < dueQuestionIds.length - 1) {
      setCurrentQuestionId(dueQuestionIds[currentIndex + 1]);
      setUserAnswer([]);
      setViewMode('question');
    } else {
      // Session complete
      endSession();
    }
  };

  const endSession = () => {
    if (currentSession) {
      const completed: SmartPracticeSession = {
        ...currentSession,
        endTime: Date.now()
      };

      const newHistory: SmartPracticeHistory = {
        ...history,
        sessions: [...history.sessions, completed]
      };

      saveHistory(newHistory);
      setCompletedSession(completed);
    }

    setViewMode('stats');
    setCurrentSession(null);
    setCurrentQuestionId(null);
    setDueQuestionIds([]);
    setSessionStarted(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderModeSelection = () => {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-4xl w-full">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 border border-white/20">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <span className="text-4xl">🧠</span>
                </div>
                <h2 className="text-5xl font-black text-white">Smart Practice</h2>
              </div>
              <p className="text-xl text-white/90">Spaced Repetition - Choose your practice mode</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-10">
              {/* Random Mode */}
              <button
                onClick={() => handleModeSelect('random')}
                className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 text-left shadow-xl"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">🎲</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Random Mode</h3>
                <p className="text-white/70">Review due cards from all topics. Intelligent spaced repetition.</p>
                <div className="mt-4 px-4 py-2 bg-blue-500/20 rounded-xl border border-blue-400/30 inline-block">
                  <span className="text-white font-bold">All Topics Mixed</span>
                </div>
              </button>

              {/* Topic Selection Mode */}
              <button
                onClick={() => handleModeSelect('topics')}
                className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 text-left shadow-xl"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl">📚</span>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Topics Mode</h3>
                <p className="text-white/70">Review due cards from specific topics. Focused learning with spaced repetition.</p>
                <div className="mt-4 px-4 py-2 bg-teal-500/20 rounded-xl border border-teal-400/30 inline-block">
                  <span className="text-white font-bold">Choose Topics</span>
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
  };

  const renderConfig = () => {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-4xl w-full">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-10 border border-white/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl mx-auto mb-4">
                <span className="text-4xl">{practiceMode === 'random' ? '🎲' : '📚'}</span>
              </div>
              <h2 className="text-4xl font-black text-white mb-2">
                {practiceMode === 'random' ? 'Random Mode' : 'Topics Mode'}
              </h2>
              <p className="text-white/80">Configure your smart practice session</p>
            </div>

            <div className="space-y-6">
              {/* Topics Selection (only in topics mode) */}
              {practiceMode === 'topics' && (
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
                          <span className={`font-bold ${isSelected ? 'text-white' : 'text-white/80'}`}>
                            {topic}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-white/60 text-sm mt-2">
                    {selectedTopics.length === 0 ? 'Select at least one topic' : `${selectedTopics.length} topic(s) selected`}
                  </p>
                </div>
              )}

              {/* Time Selection */}
              <div>
                <label className="block text-white font-bold mb-3">Session Time</label>

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
                        max="120"
                        step="5"
                        value={timeMinutes}
                        onChange={(e) => setTimeMinutes(parseInt(e.target.value))}
                        className="flex-1 h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={timeMinutes}
                        onChange={(e) => setTimeMinutes(parseInt(e.target.value))}
                        className="w-24 px-4 py-2 bg-white/20 text-white rounded-xl border border-white/30 focus:border-white/60 focus:outline-none font-bold text-center"
                      />
                    </div>
                    <p className="text-white/60 text-sm mt-2">
                      Review due cards for {timeMinutes} minutes
                    </p>
                  </>
                )}
              </div>

              {practiceMode === 'random' && (
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                  <p className="text-white/80">
                    <strong className="text-white">All topics</strong> will be mixed. {isUnlimited ? 'Review as many cards as you want!' : 'Review due cards until time runs out!'}
                  </p>
                </div>
              )}

              {practiceMode === 'topics' && selectedTopics.length > 0 && (
                <div className="bg-teal-500/20 rounded-2xl p-4 border border-teal-400/30">
                  <p className="text-white/90 text-sm">
                    <strong className="text-white">{selectedTopics.length} topic(s) selected</strong> - Only due cards from these topics will be shown
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setViewMode('select')}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-xl border border-white/30 transition-all"
              >
                Back
              </button>
              <button
                onClick={startSession}
                disabled={practiceMode === 'topics' && selectedTopics.length === 0}
                className={`flex-1 font-black py-4 px-6 rounded-xl shadow-xl transform hover:scale-105 transition-all disabled:hover:scale-100 ${
                  practiceMode === 'random'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400'
                    : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed'
                } text-white`}
              >
                Start Practice
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStats = () => {
    const stats = getSmartPracticeStats(history, allQuestions.length);

    return (
      <div className="min-h-full relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-teal-500/20 to-blue-500/20 backdrop-blur-xl text-white rounded-2xl p-6 mb-8 border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🧠</span>
                </div>
                <div>
                  <div className="text-sm text-white/80 font-semibold">Smart Practice</div>
                  <div className="text-xl font-black">Statistics & Progress</div>
                </div>
              </div>
              <button
                onClick={onExit}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-6 rounded-xl border border-white/30 transition-all"
              >
                ← Back to Home
              </button>
            </div>
          </div>

          {/* Session Summary (if just completed) */}
          {completedSession && (
            <div className="bg-green-500/10 backdrop-blur-xl border-2 border-green-500/50 rounded-2xl p-8 mb-8 shadow-2xl">
              <h2 className="text-3xl font-black text-white mb-4 text-center">Session abgeschlossen! 🎉</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-black text-white mb-2">{completedSession.questionsReviewed}</div>
                  <div className="text-white/90 font-semibold">Fragen bearbeitet</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-green-400 mb-2">{completedSession.correctAnswers}</div>
                  <div className="text-white/90 font-semibold">Richtig</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-red-400 mb-2">{completedSession.incorrectAnswers}</div>
                  <div className="text-white/90 font-semibold">Falsch</div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-xl">
              <div className="text-4xl font-black text-blue-400 mb-2">{stats.dueCount}</div>
              <div className="text-white/90 font-semibold">Fällige Karten</div>
              <div className="text-xs text-white/60 mt-1">Heute zu wiederholen</div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-xl">
              <div className="text-4xl font-black text-green-400 mb-2">{stats.newCount}</div>
              <div className="text-white/90 font-semibold">Neue Karten</div>
              <div className="text-xs text-white/60 mt-1">Noch nicht gelernt</div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-xl">
              <div className="text-4xl font-black text-amber-400 mb-2">{stats.learningCount}</div>
              <div className="text-white/90 font-semibold">In Lernphase</div>
              <div className="text-xs text-white/60 mt-1">Noch nicht gefestigt</div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-xl">
              <div className="text-4xl font-black text-purple-400 mb-2">{stats.matureCount}</div>
              <div className="text-white/90 font-semibold">Gefestigt</div>
              <div className="text-xs text-white/60 mt-1">Gut gelernt</div>
            </div>
          </div>

          {/* Progress Section */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl mb-8">
            <h2 className="text-3xl font-black text-white mb-6">Gesamtfortschritt</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-black text-white mb-2">{stats.totalReviewed}</div>
                <div className="text-white/80 text-sm">Gesamte Wiederholungen</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-black text-green-400 mb-2">{stats.accuracy}%</div>
                <div className="text-white/80 text-sm">Genauigkeit</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-black text-white mb-2">
                  {stats.totalCorrect} / {stats.totalIncorrect}
                </div>
                <div className="text-white/80 text-sm">Richtig / Falsch</div>
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl mb-8">
            <h2 className="text-3xl font-black text-white mb-6">Wie funktioniert Smart Practice?</h2>
            <div className="space-y-3 text-white/90">
              <p className="flex items-start gap-3">
                <span className="text-blue-400 text-xl flex-shrink-0">🧠</span>
                <span><strong>Spaced Repetition:</strong> Fragen werden wiederholt, bevor du sie vergisst</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-green-400 text-xl flex-shrink-0">📈</span>
                <span><strong>Intelligente Intervalle:</strong> Je besser du eine Frage kennst, desto seltener wird sie gezeigt</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-purple-400 text-xl flex-shrink-0">⭐</span>
                <span><strong>Selbst-Bewertung:</strong> Du bewertest nach jeder Frage, wie leicht sie war</span>
              </p>
              <p className="flex items-start gap-3">
                <span className="text-amber-400 text-xl flex-shrink-0">🎯</span>
                <span><strong>Fokus auf Schwächen:</strong> Schwierige Fragen kommen häufiger vor</span>
              </p>
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={() => setViewMode('select')}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-white font-black py-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg"
          >
            Neue Session starten →
          </button>
        </div>
      </div>
    );
  };

  const renderQuestion = () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion || !currentSession) return null;

    const currentIndex = dueQuestionIds.indexOf(currentQuestionId!);
    const progress = Math.round(((currentIndex + 1) / dueQuestionIds.length) * 100);

    return (
      <div className="min-h-full relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-4xl mx-auto">
          {/* Header with Progress */}
          <div className="mb-8">
            <div className="bg-gradient-to-r from-teal-500/20 to-blue-500/20 backdrop-blur-xl text-white rounded-2xl p-6 mb-4 border border-white/20 shadow-2xl">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Frage {currentIndex + 1} von {dueQuestionIds.length}
                  </h2>
                  <p className="text-white/80 text-sm">
                    Session: {currentSession.correctAnswers} richtig, {currentSession.incorrectAnswers} falsch
                    {!isUnlimited && ` • Zeit: ${formatTime(timeRemaining)}`}
                  </p>
                </div>
                <button
                  onClick={endSession}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-xl border border-white/30 transition-all text-sm"
                >
                  Session beenden
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-white/20 rounded-full h-3 border border-white/30 overflow-hidden backdrop-blur-sm">
              <div
                className="bg-gradient-to-r from-teal-500 to-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl mb-8">
            {/* Category Badge */}
            <div className="flex items-center gap-2 mb-6">
              <span className="px-3 py-1 bg-gradient-to-r from-teal-500 to-blue-500 text-white text-sm font-bold rounded-lg border border-white/30">
                {currentQuestion.topic}
              </span>
              {currentQuestion.subtopic && (
                <span className="px-3 py-1 bg-white/20 text-white text-sm rounded-lg border border-white/30">
                  {currentQuestion.subtopic}
                </span>
              )}
            </div>

            {/* Question Text */}
            <div
              className="text-white text-lg mb-6 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
            />

            {/* Answer Options */}
            {currentQuestion.type === 'multiple-choice-single' && (
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all backdrop-blur-sm ${
                      userAnswer === option
                        ? 'border-teal-400 bg-teal-500/20'
                        : 'border-white/30 bg-white/5 hover:border-white/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={option}
                      checked={userAnswer === option}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      className="w-5 h-5"
                    />
                    <span className="text-white flex-1" dangerouslySetInnerHTML={{ __html: option }} />
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === 'multiple-choice-multiple' && (
              <div className="space-y-3">
                <p className="text-white/70 text-sm mb-2">
                  Wähle genau {currentQuestion.correctAnswer.length} Antworten
                </p>
                {currentQuestion.options.map((option, index) => {
                  const current = Array.isArray(userAnswer) ? userAnswer : [];
                  const isSelected = current.includes(option);
                  const maxReached = current.length >= currentQuestion.correctAnswer.length;

                  return (
                    <label
                      key={index}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all backdrop-blur-sm ${
                        isSelected
                          ? 'border-teal-400 bg-teal-500/20 cursor-pointer'
                          : maxReached
                            ? 'border-white/20 bg-white/5 opacity-50 cursor-not-allowed'
                            : 'border-white/30 bg-white/5 hover:border-white/50 cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={option}
                        checked={isSelected}
                        disabled={!isSelected && maxReached}
                        onChange={(e) => {
                          if (e.target.checked && !maxReached) {
                            setUserAnswer([...current, option]);
                          } else if (!e.target.checked) {
                            setUserAnswer(current.filter(a => a !== option));
                          }
                        }}
                        className="w-5 h-5"
                      />
                      <span className="text-white flex-1" dangerouslySetInnerHTML={{ __html: option }} />
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleAnswer}
            disabled={
              (currentQuestion.type === 'multiple-choice-single' && !userAnswer) ||
              (currentQuestion.type === 'multiple-choice-multiple' && (!Array.isArray(userAnswer) || userAnswer.length === 0))
            }
            className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 disabled:from-gray-400 disabled:to-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:hover:scale-100 disabled:shadow-none text-lg"
          >
            Antwort zeigen
          </button>
        </div>
      </div>
    );
  };

  const renderAnswer = () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return null;

    let isCorrect = false;
    let correctAnswerText: string | string[] = '';

    if (currentQuestion.type === 'multiple-choice-single') {
      // Find the index of the selected option text
      const selectedIndex = currentQuestion.options.indexOf(userAnswer as string);
      isCorrect = currentQuestion.correctAnswer.length === 1 &&
                  currentQuestion.correctAnswer[0] === selectedIndex;
      // Get the correct answer text for display
      correctAnswerText = currentQuestion.correctAnswer.length > 0
        ? currentQuestion.options[currentQuestion.correctAnswer[0]] || ''
        : '';
    } else if (currentQuestion.type === 'multiple-choice-multiple') {
      // Convert selected option texts to indices
      const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
      const selectedIndices = userAnswers
        .map(text => currentQuestion.options.indexOf(text))
        .filter(idx => idx !== -1)
        .sort((a, b) => a - b);
      const correctIndices = [...(currentQuestion.correctAnswer || [])].sort((a, b) => a - b);
      isCorrect = selectedIndices.length === correctIndices.length &&
                  selectedIndices.every((idx, i) => idx === correctIndices[i]);
      // Get the correct answer texts for display
      correctAnswerText = (currentQuestion.correctAnswer || [])
        .map(idx => currentQuestion.options[idx])
        .filter(Boolean);
    }

    return (
      <div className="min-h-full relative bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="relative z-10 p-8 max-w-4xl mx-auto">
          {/* Result Banner */}
          <div className={`backdrop-blur-xl rounded-2xl p-6 mb-8 border-2 shadow-2xl ${
            isCorrect
              ? 'bg-green-500/20 border-green-500/50'
              : 'bg-red-500/20 border-red-500/50'
          }`}>
            <div className="text-center">
              <div className="text-5xl mb-2">{isCorrect ? '✅' : '❌'}</div>
              <h2 className={`text-3xl font-black mb-2 ${
                isCorrect ? 'text-green-400' : 'text-red-400'
              }`}>
                {isCorrect ? 'Richtig!' : 'Falsch'}
              </h2>
            </div>
          </div>

          {/* Question Review */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl mb-8">
            <h3 className="text-xl font-bold text-white mb-4">Frage</h3>
            <div
              className="text-white/90 mb-6"
              dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
            />

            {!isCorrect && (
              <>
                <h3 className="text-xl font-bold text-white mb-4">Deine Antwort</h3>
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
                  <div className="text-red-300">
                    {Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer}
                  </div>
                </div>
              </>
            )}

            <h3 className="text-xl font-bold text-white mb-4">Korrekte Antwort</h3>
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl backdrop-blur-sm">
              <div className="text-green-300" dangerouslySetInnerHTML={{
                __html: Array.isArray(correctAnswerText) ? correctAnswerText.join(', ') : correctAnswerText
              }} />
            </div>

            {currentQuestion.explanation && (
              <>
                <h3 className="text-xl font-bold text-white mb-4">Erklärung</h3>
                <div
                  className="text-white/90 p-4 bg-white/5 rounded-xl border border-white/20 backdrop-blur-sm"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }}
                />
              </>
            )}
          </div>

          {/* Rating Buttons */}
          <div className="bg-white/10 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl mb-4">
            <h3 className="text-xl font-bold text-white mb-4 text-center">Wie schwer war diese Frage?</h3>
            <p className="text-white/70 text-sm text-center mb-6">
              Deine Bewertung bestimmt, wann du diese Frage wieder siehst
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => rateAnswer(ReviewQuality.AGAIN)}
                className="flex flex-col items-center gap-2 p-6 bg-red-500/20 hover:bg-red-500/30 border-2 border-red-500/50 rounded-xl transition-all backdrop-blur-sm"
              >
                <span className="text-3xl">😰</span>
                <span className="font-bold text-white">Nochmal</span>
                <span className="text-xs text-red-200">&lt; 10 Min</span>
              </button>

              <button
                onClick={() => rateAnswer(ReviewQuality.HARD)}
                className="flex flex-col items-center gap-2 p-6 bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-500/50 rounded-xl transition-all backdrop-blur-sm"
              >
                <span className="text-3xl">🤔</span>
                <span className="font-bold text-white">Schwer</span>
                <span className="text-xs text-amber-200">1 Tag</span>
              </button>

              <button
                onClick={() => rateAnswer(ReviewQuality.GOOD)}
                className="flex flex-col items-center gap-2 p-6 bg-green-500/20 hover:bg-green-500/30 border-2 border-green-500/50 rounded-xl transition-all backdrop-blur-sm"
              >
                <span className="text-3xl">😊</span>
                <span className="font-bold text-white">Gut</span>
                <span className="text-xs text-green-200">3-6 Tage</span>
              </button>

              <button
                onClick={() => rateAnswer(ReviewQuality.EASY)}
                className="flex flex-col items-center gap-2 p-6 bg-blue-500/20 hover:bg-blue-500/30 border-2 border-blue-500/50 rounded-xl transition-all backdrop-blur-sm"
              >
                <span className="text-3xl">😎</span>
                <span className="font-bold text-white">Leicht</span>
                <span className="text-xs text-blue-200">7+ Tage</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 text-white text-xl border border-white/20">
          Lade Fragen...
        </div>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'select' && renderModeSelection()}
      {viewMode === 'config' && renderConfig()}
      {viewMode === 'stats' && renderStats()}
      {viewMode === 'question' && renderQuestion()}
      {viewMode === 'answer' && renderAnswer()}
    </>
  );
}
