import React, { useEffect, useRef } from 'react';
import { Question, Topic } from '../../types/Question';
import { QuestionNavigator } from './QuestionNavigator';
import {
  ExtendedExamHistory,
  ExtendedExamHistoryEntry,
  StoredUserAnswers,
  StoredQuestion,
  createEmptyExtendedHistory,
  migrateToExtendedHistory,
  isExtendedHistory
} from '../../types/Progress';

// Legacy interfaces for backwards compatibility
export interface ExamHistoryEntry {
  date: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  passed: boolean;
}

export interface ExamHistory {
  entries: ExamHistoryEntry[];
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  overallPercentage: number;
}

interface CategoryScore {
  category: Topic;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  status: 'excellent' | 'good' | 'needs_improvement' | 'weakness';
}

const CATEGORY_LABELS: Record<Topic, string> = {
  'Network Fundamentals': 'Network Fundamentals (20%)',
  'Network Access': 'Network Access (20%)',
  'IP Connectivity': 'IP Connectivity (25%)',
  'IP Services': 'IP Services (10%)',
  'Security Fundamentals': 'Security Fundamentals (15%)',
  'Automation and Programmability': 'Automation and Programmability (10%)'
};

interface ExamResultsProps {
  questions: Question[];
  answers: Map<string, number[]>;
  dragDropAnswers?: Map<string, { [itemIndex: number]: string }>;
  matchingAnswers?: Map<string, { [leftId: string]: string }>;
  onExit: () => void;
  onReviewAnswers: (questionIndex?: number) => void;
  onRetake: () => void;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
  questions,
  answers,
  dragDropAnswers = new Map(),
  matchingAnswers = new Map(),
  onExit,
  onReviewAnswers,
  onRetake
}) => {
  // Calculate overall score
  let correctCount = 0;
  questions.forEach(question => {
    const userAnswer = answers.get(question.id) || [];
    // CRITICAL FIX: Empty answer is NEVER correct
    if (
      userAnswer.length > 0 &&
      userAnswer.length === question.correctAnswer.length &&
      userAnswer.every(a => question.correctAnswer.includes(a))
    ) {
      correctCount++;
    }
  });

  const totalQuestions = questions.length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const passed = percentage >= 83; // CCNA passing score ~825/1000

  // Calculate category breakdown
  const categoryScores: CategoryScore[] = [];
  const categoryCounts = new Map<Topic, { total: number; correct: number }>();

  questions.forEach(question => {
    const cat = question.topic;
    if (!categoryCounts.has(cat)) {
      categoryCounts.set(cat, { total: 0, correct: 0 });
    }
    const counts = categoryCounts.get(cat)!;
    counts.total++;

    const userAnswer = answers.get(question.id) || [];
    // CRITICAL FIX: Empty answer is NEVER correct
    if (
      userAnswer.length > 0 &&
      userAnswer.length === question.correctAnswer.length &&
      userAnswer.every(a => question.correctAnswer.includes(a))
    ) {
      counts.correct++;
    }
  });

  categoryCounts.forEach((counts, category) => {
    const catPercentage = Math.round((counts.correct / counts.total) * 100);
    let status: CategoryScore['status'];
    if (catPercentage >= 85) status = 'excellent';
    else if (catPercentage >= 75) status = 'good';
    else if (catPercentage >= 60) status = 'needs_improvement';
    else status = 'weakness';

    categoryScores.push({
      category,
      totalQuestions: counts.total,
      correctAnswers: counts.correct,
      percentage: catPercentage,
      status
    });
  });

  // Sort by percentage (worst first for attention)
  categoryScores.sort((a, b) => a.percentage - b.percentage);

  // Guard against React Strict Mode double-invocation
  const savedRef = useRef(false);

  // Generate a unique exam signature for deduplication
  const examSignature = `${totalQuestions}-${correctCount}-${questions.map(q => q.id).join(',')}`;

  // Save exam results to localStorage (only once on mount)
  useEffect(() => {
    // Prevent double-save in React 18 Strict Mode
    if (savedRef.current) return;
    savedRef.current = true;

    const saveExamResults = () => {
      try {
        const historyJson = localStorage.getItem('examHistory');
        let history: ExtendedExamHistory;

        if (historyJson) {
          const parsed = JSON.parse(historyJson);
          // Migrate legacy format if needed
          if (isExtendedHistory(parsed)) {
            history = parsed;
          } else {
            history = migrateToExtendedHistory(parsed);
          }
        } else {
          history = createEmptyExtendedHistory();
        }

        // Check if this exact exam was already saved (prevent duplicates)
        const lastEntry = history.entries[history.entries.length - 1];
        if (lastEntry) {
          const lastSignature = `${lastEntry.totalQuestions}-${lastEntry.correctAnswers}-${lastEntry.questionIds?.join(',') || ''}`;
          const timeDiff = Date.now() - new Date(lastEntry.date).getTime();
          // If same signature and saved within last 5 seconds, skip
          if (lastSignature === examSignature && timeDiff < 5000) {
            console.log('Exam already saved, skipping duplicate');
            return;
          }
        }

        // Build topic stats for this exam
        const examTopicStats: Record<Topic, { total: number; correct: number }> = {
          'Network Fundamentals': { total: 0, correct: 0 },
          'Network Access': { total: 0, correct: 0 },
          'IP Connectivity': { total: 0, correct: 0 },
          'IP Services': { total: 0, correct: 0 },
          'Security Fundamentals': { total: 0, correct: 0 },
          'Automation and Programmability': { total: 0, correct: 0 }
        };

        // Collect incorrect question IDs and calculate longest streak
        const incorrectIds: string[] = [];
        let currentStreak = 0;
        let longestStreakInExam = 0;

        questions.forEach(question => {
          const topic = question.topic;
          examTopicStats[topic].total++;

          const userAnswer = answers.get(question.id) || [];
          const isCorrect = userAnswer.length > 0 &&
                           userAnswer.length === question.correctAnswer.length &&
                           userAnswer.every(a => question.correctAnswer.includes(a));

          if (isCorrect) {
            examTopicStats[topic].correct++;
            currentStreak++;
            if (currentStreak > longestStreakInExam) {
              longestStreakInExam = currentStreak;
            }
          } else {
            incorrectIds.push(question.id);
            currentStreak = 0;
          }
        });

        // Build stored user answers
        const storedAnswers: StoredUserAnswers = {
          multipleChoice: {},
          dragDrop: {},
          matching: {}
        };

        // Store multiple-choice answers
        answers.forEach((value, key) => {
          storedAnswers.multipleChoice[key] = value;
        });

        // Store drag-drop answers
        dragDropAnswers.forEach((value, key) => {
          storedAnswers.dragDrop[key] = value;
        });

        // Store matching answers
        matchingAnswers.forEach((value, key) => {
          storedAnswers.matching[key] = value;
        });

        // Store shuffled questions for accurate review
        const storedQuestions: StoredQuestion[] = questions.map(q => ({
          id: q.id,
          topic: q.topic,
          subtopic: q.subtopic,
          difficulty: q.difficulty,
          type: q.type,
          question: q.question,
          options: q.options, // Already shuffled
          correctAnswer: q.correctAnswer, // Already mapped to shuffled positions
          explanation: q.explanation
        }));

        // Create new extended entry
        const newEntry: ExtendedExamHistoryEntry = {
          date: new Date().toISOString(),
          totalQuestions,
          correctAnswers: correctCount,
          percentage,
          passed,
          topicStats: examTopicStats,
          incorrectQuestionIds: incorrectIds,
          longestStreakInExam,
          questionIds: questions.map(q => q.id),
          userAnswers: storedAnswers,
          shuffledQuestions: storedQuestions
        };
        history.entries.push(newEntry);

        // Update aggregated totals
        history.totalQuestionsAnswered += totalQuestions;
        history.totalCorrectAnswers += correctCount;
        history.overallPercentage = Math.round(
          (history.totalCorrectAnswers / history.totalQuestionsAnswered) * 100
        );

        // Update aggregated topic stats
        Object.keys(examTopicStats).forEach(topic => {
          const t = topic as Topic;
          history.topicStats[t].totalAnswered += examTopicStats[t].total;
          history.topicStats[t].totalCorrect += examTopicStats[t].correct;
        });

        // Update incorrect questions count
        incorrectIds.forEach(id => {
          history.incorrectQuestions[id] = (history.incorrectQuestions[id] || 0) + 1;
        });

        // Update best streak
        if (longestStreakInExam > history.bestStreak) {
          history.bestStreak = longestStreakInExam;
        }

        // Update current streak (continues from previous if first answer was correct)
        if (questions.length > 0) {
          const firstQuestion = questions[0];
          const firstAnswer = answers.get(firstQuestion.id) || [];
          const firstCorrect = firstAnswer.length > 0 &&
                              firstAnswer.length === firstQuestion.correctAnswer.length &&
                              firstAnswer.every(a => firstQuestion.correctAnswer.includes(a));

          if (firstCorrect && history.lastAnswerCorrect) {
            // Continue streak from previous exam
            let streakFromStart = 0;
            for (const q of questions) {
              const ua = answers.get(q.id) || [];
              const correct = ua.length > 0 &&
                             ua.length === q.correctAnswer.length &&
                             ua.every(a => q.correctAnswer.includes(a));
              if (correct) {
                streakFromStart++;
              } else {
                break;
              }
            }
            history.currentStreak += streakFromStart;
          } else {
            // Reset streak to longest streak ending at the end of this exam
            let endStreak = 0;
            for (let i = questions.length - 1; i >= 0; i--) {
              const q = questions[i];
              const ua = answers.get(q.id) || [];
              const correct = ua.length > 0 &&
                             ua.length === q.correctAnswer.length &&
                             ua.every(a => q.correctAnswer.includes(a));
              if (correct) {
                endStreak++;
              } else {
                break;
              }
            }
            history.currentStreak = endStreak;
          }

          // Update best streak if current is higher
          if (history.currentStreak > history.bestStreak) {
            history.bestStreak = history.currentStreak;
          }

          // Track if last answer was correct for next exam
          const lastQuestion = questions[questions.length - 1];
          const lastAnswer = answers.get(lastQuestion.id) || [];
          history.lastAnswerCorrect = lastAnswer.length > 0 &&
                                      lastAnswer.length === lastQuestion.correctAnswer.length &&
                                      lastAnswer.every(a => lastQuestion.correctAnswer.includes(a));
        }

        localStorage.setItem('examHistory', JSON.stringify(history));
      } catch (error) {
        console.error('Error saving exam history:', error);
      }
    };

    saveExamResults();
  }, []); // Only run once on mount

  // Generate recommendations
  const weaknesses = categoryScores.filter(c => c.status === 'weakness');
  const needsImprovement = categoryScores.filter(c => c.status === 'needs_improvement');
  const strengths = categoryScores.filter(c => c.status === 'excellent' || c.status === 'good');

  const getStatusIcon = (status: CategoryScore['status']) => {
    switch (status) {
      case 'excellent': return '✅';
      case 'good': return '✅';
      case 'needs_improvement': return '⚠️';
      case 'weakness': return '❌';
    }
  };

  const getStatusColor = (status: CategoryScore['status']) => {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-green-400';
      case 'needs_improvement': return 'text-yellow-400';
      case 'weakness': return 'text-red-400';
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 85) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Calculate correct answers map for QuestionNavigator
  const correctAnswers = new Map<number, boolean>();
  questions.forEach((q, idx) => {
    const userAnswer = answers.get(q.id) || [];
    // CRITICAL FIX: Empty answer is NEVER correct
    const isCorrect = userAnswer.length > 0 &&
                     userAnswer.length === q.correctAnswer.length &&
                     userAnswer.every(a => q.correctAnswer.includes(a));
    correctAnswers.set(idx, isCorrect);
  });

  return (
    <div className="min-h-full relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col">
      <div className="absolute inset-0 opacity-20">
        <div className={`absolute top-0 left-1/4 w-96 h-96 ${passed ? 'bg-green-500' : 'bg-red-500'} rounded-full mix-blend-multiply filter blur-3xl animate-pulse`}></div>
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 ${passed ? 'bg-emerald-500' : 'bg-rose-500'} rounded-full mix-blend-multiply filter blur-3xl animate-pulse`} style={{animationDelay: '2s'}}></div>
      </div>

      {/* Question Navigator with green/red indicators */}
      <div className="relative z-10">
        <QuestionNavigator
          totalQuestions={questions.length}
          currentQuestion={0}
          answeredQuestions={new Set(questions.map((_, i) => i))}
          correctAnswers={correctAnswers}
          onNavigate={onReviewAnswers}
          isSubmitted={true}
        />
      </div>

      <div className="relative z-10 p-8 max-w-6xl mx-auto overflow-y-auto flex-1">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className={`w-16 h-16 bg-gradient-to-br ${passed ? 'from-green-500 to-emerald-500' : 'from-red-500 to-rose-500'} rounded-2xl flex items-center justify-center shadow-2xl`}>
                <span className="text-4xl">{passed ? '🎉' : '📝'}</span>
              </div>
              <h2 className="text-4xl font-black text-white">Prüfungsergebnisse</h2>
            </div>
            <p className="text-white/80">CCNA Practice Exam</p>
          </div>

          {/* Overall Score */}
          <div className={`p-8 rounded-2xl mb-8 backdrop-blur-xl border-2 ${
            passed
              ? 'bg-green-500/20 border-green-400'
              : 'bg-red-500/20 border-red-400'
          } shadow-lg`}>
            <div className="text-center">
              <div className={`text-6xl font-black mb-4 ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {percentage}%
              </div>
              <div className="text-2xl font-bold text-white mb-2">
                {correctCount} / {totalQuestions} richtig
              </div>
              <div className={`inline-block px-6 py-2 rounded-xl text-lg font-black ${
                passed
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-red-500 to-rose-500'
              } text-white shadow-lg`}>
                {passed ? '✓ Bestanden' : '✗ Nicht bestanden'}
              </div>
              {passed && (
                <p className="text-white/90 mt-3 text-sm">
                  Herzlichen Glückwunsch! Sie haben die Prüfung bestanden.
                </p>
              )}
              {!passed && (
                <p className="text-white/90 mt-3 text-sm">
                  Bestehensgrenze: 825/1000 Punkte (≈ 83%)
                </p>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Detaillierte Auswertung nach Kategorien
            </h3>
            <div className="space-y-4">
              {categoryScores.map(score => (
                <div key={score.category} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getStatusIcon(score.status)}</span>
                      <span className="text-white font-semibold">{CATEGORY_LABELS[score.category]}</span>
                    </div>
                    <span className={`text-lg font-bold ${getStatusColor(score.status)}`}>
                      {score.percentage}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-white/10 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full ${getProgressBarColor(score.percentage)} transition-all duration-500`}
                        style={{ width: `${score.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-white/70 text-sm whitespace-nowrap">
                      {score.correctAnswers}/{score.totalQuestions} richtig
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {(weaknesses.length > 0 || needsImprovement.length > 0) && (
            <div className="mb-8 bg-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/30">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>💡</span> Empfehlungen
              </h3>

              {weaknesses.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                    <span>🔴</span> Schwachstellen (&lt; 60%)
                  </h4>
                  <ul className="space-y-2 ml-6">
                    {weaknesses.map(w => (
                      <li key={w.category} className="text-white/90">
                        <strong>{CATEGORY_LABELS[w.category]}</strong> ({w.percentage}%)
                        <p className="text-sm text-white/70">→ Intensive Wiederholung empfohlen</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {needsImprovement.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                    <span>🟡</span> Verbesserungsbedarf (60-75%)
                  </h4>
                  <ul className="space-y-2 ml-6">
                    {needsImprovement.map(w => (
                      <li key={w.category} className="text-white/90">
                        <strong>{CATEGORY_LABELS[w.category]}</strong> ({w.percentage}%)
                        <p className="text-sm text-white/70">→ Weitere Übung empfohlen</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {strengths.length > 0 && (
                <div>
                  <h4 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                    <span>✅</span> Starke Bereiche (&gt; 75%)
                  </h4>
                  <ul className="space-y-1 ml-6">
                    {strengths.map(s => (
                      <li key={s.category} className="text-white/90 text-sm">
                        {CATEGORY_LABELS[s.category]} ({s.percentage}%)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => onReviewAnswers()}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              Bewertung überprüfen
            </button>
            <button
              onClick={onRetake}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
            >
              Neues Examen
            </button>
            <button
              onClick={onExit}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 px-8 rounded-xl border-2 border-white/30 hover:border-white/50 transition-all"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
