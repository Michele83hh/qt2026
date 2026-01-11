import { useState, useEffect, useRef, useCallback } from 'react';
import { Topic, Question } from '../../types/Question';
import {
  ExtendedExamHistory,
  ExtendedExamHistoryEntry,
  migrateToExtendedHistory,
  isExtendedHistory,
  TOPIC_INFO
} from '../../types/Progress';
import { SmartPracticeHistory } from '../../types/SmartPractice';
import { notify, confirm as customConfirm } from '../../store/notificationStore';

interface TopicStat {
  topic: Topic;
  totalAnswered: number;
  totalCorrect: number;
  percentage: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'weakness';
}

interface IncorrectQuestion {
  id: string;
  count: number;
  question?: Question;
}

export default function Progress() {
  const [examHistory, setExamHistory] = useState<ExtendedExamHistory | null>(null);
  const [smartHistory, setSmartHistory] = useState<SmartPracticeHistory | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'topics' | 'smart' | 'incorrect' | 'trends'>('overview');
  const [selectedExam, setSelectedExam] = useState<{ entry: ExtendedExamHistoryEntry; examNumber: number } | null>(null);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);
  const navigatorRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation for exam review modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedExam || !selectedExam.entry.questionIds) return;

    const maxIndex = selectedExam.entry.questionIds.length - 1;

    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      setReviewQuestionIndex(prev => Math.min(maxIndex, prev + 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setReviewQuestionIndex(prev => Math.max(0, prev - 1));
    } else if (e.key === 'Escape') {
      setSelectedExam(null);
    }
  }, [selectedExam]);

  useEffect(() => {
    if (selectedExam) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedExam, handleKeyDown]);

  // Auto-scroll navigator to current question
  useEffect(() => {
    if (navigatorRef.current && selectedExam) {
      const button = navigatorRef.current.children[reviewQuestionIndex] as HTMLElement;
      if (button) {
        button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [reviewQuestionIndex, selectedExam]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load exam history
      const historyJson = localStorage.getItem('examHistory');
      if (historyJson) {
        const parsed = JSON.parse(historyJson);
        const history = isExtendedHistory(parsed)
          ? parsed
          : migrateToExtendedHistory(parsed);
        setExamHistory(history);

        // Neue Logik: 2x in Folge mit 130+ Fragen und 90%+
        let consecutiveQualifying = 0;
        const entries = history.entries || [];
        for (let i = entries.length - 1; i >= 0; i--) {
          const entry = entries[i];
          if (entry.totalQuestions >= 130 && entry.percentage >= 90) {
            consecutiveQualifying++;
          } else {
            break;
          }
        }
        setIsReady(consecutiveQualifying >= 2);
      }

      // Load smart practice history
      const smartJson = localStorage.getItem('smart-practice-history');
      if (smartJson) {
        setSmartHistory(JSON.parse(smartJson));
      }

      // Load questions for incorrect questions display
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
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  const resetProgress = () => {
    customConfirm(
      'Bist du sicher, dass du deinen gesamten Fortschritt löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.',
      () => {
        localStorage.removeItem('examHistory');
        localStorage.removeItem('smart-practice-history');
        setExamHistory(null);
        setSmartHistory(null);
        setIsReady(false);
        notify.success('Fortschritt wurde zurückgesetzt');
      },
      {
        title: 'Fortschritt zurücksetzen',
        confirmText: 'Ja, zurücksetzen',
        cancelText: 'Abbrechen',
        type: 'danger'
      }
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 75) return 'text-blue-400';
    if (percentage >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getTopicStats = (): TopicStat[] => {
    if (!examHistory) return [];

    return Object.entries(examHistory.topicStats)
      .map(([topic, stats]) => {
        const percentage = stats.totalAnswered > 0
          ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
          : 0;

        let status: TopicStat['status'];
        if (percentage >= 85) status = 'excellent';
        else if (percentage >= 75) status = 'good';
        else if (percentage >= 60) status = 'needs_improvement';
        else status = 'weakness';

        return {
          topic: topic as Topic,
          totalAnswered: stats.totalAnswered,
          totalCorrect: stats.totalCorrect,
          percentage,
          status
        };
      })
      .filter(s => s.totalAnswered > 0)
      .sort((a, b) => a.percentage - b.percentage);
  };

  const getIncorrectQuestions = (): IncorrectQuestion[] => {
    if (!examHistory) return [];

    return Object.entries(examHistory.incorrectQuestions)
      .map(([id, count]) => ({
        id,
        count,
        question: allQuestions.find(q => q.id === id)
      }))
      .filter(q => q.question)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  };

  const getSmartPracticeStats = () => {
    if (!smartHistory) {
      return { dueCount: 0, newCount: allQuestions.length, learningCount: 0, matureCount: 0, accuracy: 0 };
    }

    const now = Date.now();
    let dueCount = 0;
    let learningCount = 0;
    let matureCount = 0;

    const cardIds = new Set(Object.keys(smartHistory.cards));
    const newCount = allQuestions.filter(q => !cardIds.has(q.id)).length;

    Object.values(smartHistory.cards).forEach(card => {
      if (card.nextReview <= now) {
        dueCount++;
      }
      if (card.repetitions < 3) {
        learningCount++;
      } else {
        matureCount++;
      }
    });

    // Add new cards to due count
    dueCount += newCount;

    const accuracy = smartHistory.totalQuestionsReviewed > 0
      ? Math.round((smartHistory.totalCorrect / smartHistory.totalQuestionsReviewed) * 100)
      : 0;

    return { dueCount, newCount, learningCount, matureCount, accuracy };
  };

  // Trend chart data
  const getTrendData = () => {
    if (!examHistory || examHistory.entries.length === 0) return [];

    return examHistory.entries.slice(-10).map((entry, index) => ({
      index: index + 1,
      percentage: entry.percentage,
      date: new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    }));
  };

  const hasExamHistory = examHistory && examHistory.entries.length > 0;
  const questionsProgress = hasExamHistory ? Math.min(100, (examHistory.totalQuestionsAnswered / 130) * 100) : 0;
  const accuracyProgress = hasExamHistory ? Math.min(100, (examHistory.overallPercentage / 90) * 100) : 0;
  const topicStats = getTopicStats();
  const incorrectQuestions = getIncorrectQuestions();
  const smartStats = getSmartPracticeStats();
  const trendData = getTrendData();

  return (
    <div className="min-h-full bg-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Lernfortschritt</h1>
            <p className="text-gray-400">Verfolge deinen Weg zur CCNA-Zertifizierung</p>
          </div>
          <button
            onClick={resetProgress}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold py-3 px-6 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-all"
          >
            Zurücksetzen
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Übersicht', icon: '📊' },
            { id: 'topics', label: 'Themen', icon: '📚' },
            { id: 'smart', label: 'Smart Practice', icon: '🧠' },
            { id: 'incorrect', label: 'Problemfragen', icon: '❌' },
            { id: 'trends', label: 'Trends', icon: '📈' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {!hasExamHistory ? (
              /* No exam history yet */
              <div className="bg-gray-700 rounded-2xl p-12 text-center border border-gray-600 mb-8">
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-2xl font-bold text-white mb-2">Noch keine Exams absolviert</h2>
                <p className="text-gray-400 mb-6">
                  Starte einen Exam Mode, um deinen Fortschritt zu verfolgen.
                </p>
                <div className="bg-gray-800 rounded-xl p-4 inline-block">
                  <p className="text-sm text-gray-300">
                    <span className="text-amber-400 font-bold">Ziel:</span> 2x hintereinander 130+ Fragen mit 90%+ im Exam Mode
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Exam Readiness Card */}
                <div className={`mb-8 rounded-2xl p-6 border-2 ${
                  isReady
                    ? 'bg-green-500/20 border-green-500'
                    : 'bg-gray-700 border-gray-600'
                }`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-4xl ${
                      isReady ? 'bg-green-500' : 'bg-amber-500'
                    }`}>
                      {isReady ? '🎓' : '📈'}
                    </div>
                    <div>
                      <h2 className={`text-3xl font-black ${isReady ? 'text-green-400' : 'text-white'}`}>
                        {isReady ? 'Prüfungsbereit!' : 'Prüfungsvorbereitung'}
                      </h2>
                      <p className="text-gray-300">
                        {isReady
                          ? 'Du hast alle Kriterien erfüllt! Zeit für die echte Prüfung.'
                          : 'Arbeite weiter an deinen Zielen.'}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-gray-800/50 rounded-xl p-5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-white font-bold text-lg">Fragen beantwortet</span>
                        <span className={`font-black text-xl ${examHistory.totalQuestionsAnswered >= 130 ? 'text-green-400' : 'text-amber-400'}`}>
                          {examHistory.totalQuestionsAnswered} / 130
                        </span>
                      </div>
                      <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${examHistory.totalQuestionsAnswered >= 130 ? 'bg-green-500' : 'bg-amber-500'}`}
                          style={{ width: `${questionsProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-5">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-white font-bold text-lg">Gesamtgenauigkeit</span>
                        <span className={`font-black text-xl ${examHistory.overallPercentage >= 90 ? 'text-green-400' : 'text-amber-400'}`}>
                          {examHistory.overallPercentage}%
                        </span>
                      </div>
                      <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${examHistory.overallPercentage >= 90 ? 'bg-green-500' : 'bg-amber-500'}`}
                          style={{ width: `${accuracyProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Statistics Overview */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  <div className="bg-gray-700 rounded-xl p-5 text-center border border-gray-600">
                    <div className="text-3xl font-black text-blue-400 mb-1">
                      {examHistory.entries.length}
                    </div>
                    <div className="text-gray-300 text-sm font-semibold">Exams</div>
                  </div>
                  <div className="bg-gray-700 rounded-xl p-5 text-center border border-gray-600">
                    <div className="text-3xl font-black text-purple-400 mb-1">
                      {examHistory.totalQuestionsAnswered}
                    </div>
                    <div className="text-gray-300 text-sm font-semibold">Fragen</div>
                  </div>
                  <div className="bg-gray-700 rounded-xl p-5 text-center border border-gray-600">
                    <div className="text-3xl font-black text-green-400 mb-1">
                      {examHistory.totalCorrectAnswers}
                    </div>
                    <div className="text-gray-300 text-sm font-semibold">Richtig</div>
                  </div>
                  <div className="bg-gray-700 rounded-xl p-5 text-center border border-gray-600">
                    <div className={`text-3xl font-black mb-1 ${getProgressTextColor(examHistory.overallPercentage)}`}>
                      {examHistory.overallPercentage}%
                    </div>
                    <div className="text-gray-300 text-sm font-semibold">Durchschnitt</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl p-5 text-center border border-amber-500/30">
                    <div className="text-3xl font-black text-amber-400 mb-1">
                      🔥 {examHistory.bestStreak}
                    </div>
                    <div className="text-gray-300 text-sm font-semibold">Best Streak</div>
                  </div>
                </div>

                {/* Exam History */}
                <div className="bg-gray-700 rounded-2xl p-6 border border-gray-600">
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                    <span>📋</span> Exam-Verlauf
                  </h3>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {examHistory.entries.slice().reverse().map((entry, index) => {
                      const examNumber = examHistory.entries.length - index;
                      const hasReviewData = entry.questionIds && entry.questionIds.length > 0;
                      return (
                        <div
                          key={index}
                          onClick={() => {
                            if (hasReviewData) {
                              setSelectedExam({ entry, examNumber });
                              setReviewQuestionIndex(0);
                            } else {
                              notify.info('Dieses Exam wurde vor dem Update gespeichert und enthält keine Fragen-Details.');
                            }
                          }}
                          className={`bg-gray-800 rounded-xl p-4 flex items-center justify-between border border-gray-600 transition-all ${
                            hasReviewData ? 'cursor-pointer hover:bg-gray-700 hover:border-gray-500' : 'opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                              entry.passed ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                              {entry.passed ? '✅' : '❌'}
                            </div>
                            <div>
                              <div className="text-white font-semibold flex items-center gap-2">
                                Exam #{examNumber}
                                {hasReviewData && (
                                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                    Klicken zum Anzeigen
                                  </span>
                                )}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {formatDate(entry.date)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            {entry.longestStreakInExam > 0 && (
                              <div className="text-amber-400 text-sm font-bold">
                                🔥 {entry.longestStreakInExam}
                              </div>
                            )}
                            <div className="text-right">
                              <div className={`text-2xl font-black ${getProgressTextColor(entry.percentage)}`}>
                                {entry.percentage}%
                              </div>
                              <div className="text-gray-400 text-sm">
                                {entry.correctAnswers}/{entry.totalQuestions}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Topics Tab */}
        {activeTab === 'topics' && (
          <div className="space-y-6">
            <div className="bg-gray-700 rounded-2xl p-6 border border-gray-600">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span>📚</span> Themenübersicht
              </h3>

              {topicStats.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Noch keine Themendaten verfügbar.</p>
              ) : (
                <div className="space-y-4">
                  {topicStats.map(stat => {
                    const info = TOPIC_INFO[stat.topic];
                    return (
                      <div key={stat.topic} className="bg-gray-800 rounded-xl p-5 border border-gray-600">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-white font-bold text-lg">{info.label}</span>
                            <span className="text-gray-400 text-sm ml-2">({info.weight})</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">
                              {stat.totalCorrect}/{stat.totalAnswered}
                            </span>
                            <span className={`text-2xl font-black ${
                              stat.status === 'excellent' || stat.status === 'good' ? 'text-green-400' :
                              stat.status === 'needs_improvement' ? 'text-amber-400' : 'text-red-400'
                            }`}>
                              {stat.percentage}%
                            </span>
                            <span className="text-2xl">
                              {stat.status === 'excellent' ? '🌟' :
                               stat.status === 'good' ? '✅' :
                               stat.status === 'needs_improvement' ? '⚠️' : '❌'}
                            </span>
                          </div>
                        </div>
                        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${getProgressColor(stat.percentage)}`}
                            style={{ width: `${stat.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Topic Recommendations */}
            {topicStats.some(s => s.status === 'weakness' || s.status === 'needs_improvement') && (
              <div className="bg-blue-500/10 rounded-2xl p-6 border border-blue-500/30">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <span>💡</span> Empfehlungen
                </h3>
                <ul className="space-y-2 text-gray-300">
                  {topicStats.filter(s => s.status === 'weakness').map(s => (
                    <li key={s.topic} className="flex items-start gap-2">
                      <span className="text-red-400">🔴</span>
                      <span><strong className="text-white">{TOPIC_INFO[s.topic].label}</strong> - Intensive Wiederholung empfohlen ({s.percentage}%)</span>
                    </li>
                  ))}
                  {topicStats.filter(s => s.status === 'needs_improvement').map(s => (
                    <li key={s.topic} className="flex items-start gap-2">
                      <span className="text-amber-400">🟡</span>
                      <span><strong className="text-white">{TOPIC_INFO[s.topic].label}</strong> - Weitere Übung empfohlen ({s.percentage}%)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Smart Practice Tab */}
        {activeTab === 'smart' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl p-6 border border-blue-500/30">
                <div className="text-4xl font-black text-blue-400 mb-2">{smartStats.dueCount}</div>
                <div className="text-white font-semibold">Fällige Karten</div>
                <div className="text-gray-400 text-sm">Heute zu wiederholen</div>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 border border-green-500/30">
                <div className="text-4xl font-black text-green-400 mb-2">{smartStats.newCount}</div>
                <div className="text-white font-semibold">Neue Karten</div>
                <div className="text-gray-400 text-sm">Noch nicht gelernt</div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl p-6 border border-amber-500/30">
                <div className="text-4xl font-black text-amber-400 mb-2">{smartStats.learningCount}</div>
                <div className="text-white font-semibold">In Lernphase</div>
                <div className="text-gray-400 text-sm">Noch nicht gefestigt</div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
                <div className="text-4xl font-black text-purple-400 mb-2">{smartStats.matureCount}</div>
                <div className="text-white font-semibold">Gefestigt</div>
                <div className="text-gray-400 text-sm">Gut gelernt</div>
              </div>
            </div>

            {/* Smart Practice Accuracy */}
            <div className="bg-gray-700 rounded-2xl p-6 border border-gray-600">
              <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span>🧠</span> Smart Practice Genauigkeit
              </h3>

              <div className="flex items-center gap-6">
                <div className={`text-6xl font-black ${getProgressTextColor(smartStats.accuracy)}`}>
                  {smartStats.accuracy}%
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getProgressColor(smartStats.accuracy)}`}
                      style={{ width: `${smartStats.accuracy}%` }}
                    />
                  </div>
                  <div className="mt-2 text-gray-400 text-sm">
                    {smartHistory ? `${smartHistory.totalCorrect} richtig / ${smartHistory.totalIncorrect} falsch (${smartHistory.totalQuestionsReviewed} gesamt)` : 'Keine Daten'}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Distribution */}
            <div className="bg-gray-700 rounded-2xl p-6 border border-gray-600">
              <h3 className="text-xl font-bold text-white mb-4">Kartenverteilung</h3>
              <div className="h-8 bg-gray-600 rounded-full overflow-hidden flex">
                {smartStats.newCount > 0 && (
                  <div
                    className="bg-green-500 h-full"
                    style={{ width: `${(smartStats.newCount / allQuestions.length) * 100}%` }}
                    title={`Neu: ${smartStats.newCount}`}
                  />
                )}
                {smartStats.learningCount > 0 && (
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${(smartStats.learningCount / allQuestions.length) * 100}%` }}
                    title={`Lernend: ${smartStats.learningCount}`}
                  />
                )}
                {smartStats.matureCount > 0 && (
                  <div
                    className="bg-purple-500 h-full"
                    style={{ width: `${(smartStats.matureCount / allQuestions.length) * 100}%` }}
                    title={`Gefestigt: ${smartStats.matureCount}`}
                  />
                )}
              </div>
              <div className="flex justify-between mt-3 text-sm">
                <span className="text-green-400">● Neu ({smartStats.newCount})</span>
                <span className="text-amber-400">● Lernend ({smartStats.learningCount})</span>
                <span className="text-purple-400">● Gefestigt ({smartStats.matureCount})</span>
              </div>
            </div>
          </div>
        )}

        {/* Incorrect Questions Tab */}
        {activeTab === 'incorrect' && (
          <div className="bg-gray-700 rounded-2xl p-6 border border-gray-600">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span>❌</span> Häufig falsch beantwortete Fragen
            </h3>

            {incorrectQuestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-gray-400 text-lg">Keine Problemfragen gefunden!</p>
                <p className="text-gray-500 text-sm mt-2">Du hast alle Fragen richtig beantwortet.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {incorrectQuestions.map((item) => (
                  <div key={item.id} className="bg-gray-800 rounded-xl p-5 border border-gray-600">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-white ${
                          item.count >= 3 ? 'bg-red-500' : item.count >= 2 ? 'bg-amber-500' : 'bg-gray-600'
                        }`}>
                          {item.count}x
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded font-medium">
                            {item.question?.topic}
                          </span>
                          {item.question?.subtopic && (
                            <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                              {item.question.subtopic}
                            </span>
                          )}
                        </div>
                        <div
                          className="text-white text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: item.question?.question || '' }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            {!hasExamHistory ? (
              /* No exam history yet */
              <div className="bg-gray-700 rounded-2xl p-12 text-center border border-gray-600">
                <div className="text-6xl mb-4">📈</div>
                <h2 className="text-2xl font-bold text-white mb-2">Noch keine Trend-Daten</h2>
                <p className="text-gray-400">
                  Absolviere Exams, um deine Leistungsentwicklung zu sehen.
                </p>
              </div>
            ) : (
              <>
                {/* Performance Trend Chart */}
                <div className="bg-gray-700 rounded-2xl p-6 border border-gray-600">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>📈</span> Leistungsentwicklung (letzte 10 Exams)
                  </h3>

                  {trendData.length < 2 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Mindestens 2 Exams erforderlich für Trendanzeige</p>
                    </div>
                  ) : (
                    <div className="relative h-64">
                      {/* Y-Axis Labels */}
                      <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-gray-400 text-xs">
                        <span>100%</span>
                        <span>83%</span>
                        <span>50%</span>
                        <span>0%</span>
                      </div>

                      {/* Chart Area */}
                      <div className="ml-12 h-full relative">
                        {/* Pass Line at 83% */}
                        <div
                          className="absolute left-0 right-0 border-t-2 border-dashed border-green-500/50"
                          style={{ top: `${100 - 83}%` }}
                        >
                          <span className="absolute right-0 -top-5 text-green-400 text-xs">Bestehensgrenze</span>
                        </div>

                        {/* SVG Chart */}
                        <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                          {/* Grid Lines */}
                          <line x1="0" y1="34" x2="400" y2="34" stroke="#374151" strokeWidth="1" />
                          <line x1="0" y1="100" x2="400" y2="100" stroke="#374151" strokeWidth="1" />

                          {/* Line Chart */}
                          <polyline
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={trendData.map((d, i) =>
                              `${(i / (trendData.length - 1)) * 380 + 10},${200 - (d.percentage / 100) * 200}`
                            ).join(' ')}
                          />

                          {/* Data Points */}
                          {trendData.map((d, i) => (
                            <g key={i}>
                              <circle
                                cx={(i / (trendData.length - 1)) * 380 + 10}
                                cy={200 - (d.percentage / 100) * 200}
                                r="6"
                                fill={d.percentage >= 83 ? '#22c55e' : '#ef4444'}
                                stroke="#1f2937"
                                strokeWidth="2"
                              />
                            </g>
                          ))}
                        </svg>

                        {/* X-Axis Labels */}
                        <div className="flex justify-between mt-2 text-gray-400 text-xs">
                          {trendData.map((d, i) => (
                            <span key={i}>{d.date}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Statistics Summary */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-gray-700 rounded-xl p-6 border border-gray-600">
                    <div className="text-gray-400 text-sm mb-2">Bestes Ergebnis</div>
                    <div className="text-4xl font-black text-green-400">
                      {examHistory.entries.length > 0
                        ? Math.max(...examHistory.entries.map(e => e.percentage))
                        : 0}%
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-xl p-6 border border-gray-600">
                    <div className="text-gray-400 text-sm mb-2">Schlechtestes Ergebnis</div>
                    <div className="text-4xl font-black text-red-400">
                      {examHistory.entries.length > 0
                        ? Math.min(...examHistory.entries.map(e => e.percentage))
                        : 0}%
                    </div>
                  </div>
                  <div className="bg-gray-700 rounded-xl p-6 border border-gray-600">
                    <div className="text-gray-400 text-sm mb-2">Bestandene Exams</div>
                    <div className="text-4xl font-black text-blue-400">
                      {examHistory.entries.filter(e => e.passed).length} / {examHistory.entries.length}
                    </div>
                  </div>
                </div>

                {/* Improvement Trend */}
                {trendData.length >= 3 && (
                  <div className="bg-gray-700 rounded-xl p-6 border border-gray-600">
                    <h4 className="text-lg font-bold text-white mb-4">Trend-Analyse</h4>
                    {(() => {
                      const first3 = trendData.slice(0, 3).reduce((a, b) => a + b.percentage, 0) / 3;
                      const last3 = trendData.slice(-3).reduce((a, b) => a + b.percentage, 0) / 3;
                      const diff = Math.round(last3 - first3);

                      return (
                        <div className="flex items-center gap-4">
                          <div className={`text-5xl ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {diff >= 0 ? '📈' : '📉'}
                          </div>
                          <div>
                            <div className={`text-2xl font-black ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {diff >= 0 ? '+' : ''}{diff}%
                            </div>
                            <div className="text-gray-400">
                              {diff > 5 ? 'Starke Verbesserung!' :
                               diff > 0 ? 'Leichte Verbesserung' :
                               diff === 0 ? 'Stabil' :
                               diff > -5 ? 'Leichter Rückgang' : 'Deutlicher Rückgang'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Exam Review Modal */}
      {selectedExam && selectedExam.entry.questionIds && selectedExam.entry.userAnswers && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-600 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-600 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Exam #{selectedExam.examNumber} - Review
                </h2>
                <p className="text-gray-400 text-sm">
                  {formatDate(selectedExam.entry.date)} • {selectedExam.entry.correctAnswers}/{selectedExam.entry.totalQuestions} richtig ({selectedExam.entry.percentage}%)
                </p>
              </div>
              <button
                onClick={() => setSelectedExam(null)}
                className="text-gray-400 hover:text-white text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Question Navigator */}
            <div className="p-4 border-b border-gray-600 bg-gray-700/50 overflow-x-auto">
              <div ref={navigatorRef} className="flex gap-2 min-w-max">
                {selectedExam.entry.questionIds.map((qId, idx) => {
                  // Use stored shuffled question if available, otherwise fallback to original
                  const storedQuestion = selectedExam.entry.shuffledQuestions?.[idx];
                  const question = storedQuestion || allQuestions.find(q => q.id === qId);
                  if (!question) return null;

                  // Check if answer was correct using the stored (shuffled) question data
                  let isCorrect = false;
                  const userAnswers = selectedExam.entry.userAnswers!;
                  const userAnswer = userAnswers.multipleChoice[qId] || [];

                  // For stored questions, correctAnswer is already mapped to shuffled positions
                  isCorrect = userAnswer.length > 0 &&
                             userAnswer.length === question.correctAnswer.length &&
                             userAnswer.every(a => question.correctAnswer.includes(a));

                  return (
                    <button
                      key={idx}
                      onClick={() => setReviewQuestionIndex(idx)}
                      className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                        reviewQuestionIndex === idx
                          ? 'ring-2 ring-white scale-110'
                          : ''
                      } ${
                        isCorrect
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const qId = selectedExam.entry.questionIds![reviewQuestionIndex];
                // Use stored shuffled question if available, otherwise fallback to original
                const storedQuestion = selectedExam.entry.shuffledQuestions?.[reviewQuestionIndex];
                const question = storedQuestion || allQuestions.find(q => q.id === qId);
                const userAnswers = selectedExam.entry.userAnswers!;

                if (!question) {
                  return (
                    <div className="text-center text-gray-400 py-12">
                      Frage nicht gefunden (möglicherweise gelöscht)
                    </div>
                  );
                }

                const userAnswer = userAnswers.multipleChoice[qId] || [];

                return (
                  <div className="space-y-6">
                    {/* Question Text */}
                    <div className="bg-gray-700 rounded-xl p-5 border border-gray-600">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-gray-600 text-gray-300 text-xs rounded font-medium">
                          {question.topic}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded font-medium ${
                          question.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                          question.difficulty === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {question.difficulty}
                        </span>
                        {question.type === 'multiple-choice-multiple' && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded font-medium">
                            Wähle {question.correctAnswer.length}
                          </span>
                        )}
                      </div>
                      <div
                        className="text-white text-lg leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: question.question }}
                      />
                    </div>

                    {/* Answer Options (for multiple choice) */}
                    {(question.type === 'multiple-choice-single' || question.type === 'multiple-choice-multiple' || question.type === 'true-false') && (
                      <div className="space-y-3">
                        {question.options.map((option, optIdx) => {
                          const isSelected = userAnswer.includes(optIdx);
                          const isCorrectAnswer = question.correctAnswer.includes(optIdx);

                          return (
                            <div
                              key={optIdx}
                              className={`p-4 rounded-xl border-2 ${
                                isCorrectAnswer
                                  ? 'bg-green-500/20 border-green-500'
                                  : isSelected
                                    ? 'bg-red-500/20 border-red-500'
                                    : 'bg-gray-700 border-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                  isCorrectAnswer
                                    ? 'bg-green-500 text-white'
                                    : isSelected
                                      ? 'bg-red-500 text-white'
                                      : 'bg-gray-600 text-gray-300'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </div>
                                <span
                                  className="text-white flex-1"
                                  dangerouslySetInnerHTML={{ __html: option }}
                                />
                                {isCorrectAnswer && <span className="text-green-400 text-xl">✓</span>}
                                {isSelected && !isCorrectAnswer && <span className="text-red-400 text-xl">✗</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
                        <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2">
                          <span>💡</span> Erklärung
                        </h4>
                        <div
                          className="text-gray-300 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: question.explanation }}
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer - Navigation */}
            <div className="p-4 border-t border-gray-600 flex justify-between items-center">
              <button
                onClick={() => setReviewQuestionIndex(Math.max(0, reviewQuestionIndex - 1))}
                disabled={reviewQuestionIndex === 0}
                className="bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                ← Vorherige
              </button>

              <span className="text-gray-400">
                Frage {reviewQuestionIndex + 1} von {selectedExam.entry.questionIds!.length}
              </span>

              <button
                onClick={() => setReviewQuestionIndex(Math.min(selectedExam.entry.questionIds!.length - 1, reviewQuestionIndex + 1))}
                disabled={reviewQuestionIndex === selectedExam.entry.questionIds!.length - 1}
                className="bg-blue-500 hover:bg-blue-400 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Nächste →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
