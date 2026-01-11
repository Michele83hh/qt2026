import { useState, useEffect } from 'react';

interface HomeProps {
  onStartExam: () => void;
  onStartPractice: () => void;
  onStartSubnetting: () => void;
  onStartSmartPractice: () => void;
}

interface QualifyingExam {
  totalQuestions: number;
  percentage: number;
  passed: boolean;  // 130+ Fragen und 90%+
  date: string;
}

interface ExamReadiness {
  isReady: boolean;
  consecutiveQualifying: number;  // Wie viele in Folge qualifiziert (0, 1, oder 2)
  lastTwoExams: QualifyingExam[];
  totalExams: number;
}

export default function Home({ onStartExam, onStartPractice, onStartSubnetting, onStartSmartPractice }: HomeProps) {
  const [questionCount, setQuestionCount] = useState(0);
  const [examReadiness, setExamReadiness] = useState<ExamReadiness>({
    isReady: false,
    consecutiveQualifying: 0,
    lastTwoExams: [],
    totalExams: 0
  });

  useEffect(() => {
    // Load question count
    const loadQuestionCount = async () => {
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

        setQuestionCount(data.questions?.length || 0);
      } catch (error) {
        console.error('Error loading question count:', error);
        setQuestionCount(500); // Fallback
      }
    };

    // Load exam readiness from localStorage
    // Kriterium: 2x in Folge mindestens 130 Fragen mit 90%+ im Exam Mode
    const loadExamReadiness = () => {
      try {
        const historyJson = localStorage.getItem('examHistory');
        if (historyJson) {
          const history = JSON.parse(historyJson);
          const entries = history.entries || [];

          if (entries.length === 0) {
            setExamReadiness({
              isReady: false,
              consecutiveQualifying: 0,
              lastTwoExams: [],
              totalExams: 0
            });
            return;
          }

          // Prüfe die letzten Exams (neueste zuerst)
          const lastTwoExams: QualifyingExam[] = entries
            .slice(-2)
            .reverse()
            .map((entry: any) => ({
              totalQuestions: entry.totalQuestions || 0,
              percentage: entry.percentage || 0,
              passed: (entry.totalQuestions >= 130) && (entry.percentage >= 90),
              date: entry.date
            }));

          // Zähle aufeinanderfolgende qualifizierende Exams (von hinten)
          let consecutiveQualifying = 0;
          for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            if (entry.totalQuestions >= 130 && entry.percentage >= 90) {
              consecutiveQualifying++;
            } else {
              break;
            }
          }

          // Ready = mind. 2 in Folge qualifiziert
          const isReady = consecutiveQualifying >= 2;

          setExamReadiness({
            isReady,
            consecutiveQualifying: Math.min(consecutiveQualifying, 2),
            lastTwoExams,
            totalExams: entries.length
          });
        }
      } catch (error) {
        console.error('Error loading exam readiness:', error);
      }
    };

    loadQuestionCount();
    loadExamReadiness();
  }, []);

  return (
    <div className="min-h-full bg-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-gray-700 rounded-2xl px-6 py-3 shadow-sm mb-6 border border-gray-600">
            <span className="text-blue-400 font-bold text-lg">🎓 CCNA 200-301 Certification</span>
          </div>
          <h1 className="text-6xl font-black text-white mb-4">
            Master Your CCNA Exam
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Practice with {questionCount > 0 ? questionCount : '500+'} questions across all exam topics. Get instant feedback and detailed explanations.
          </p>
        </div>

        {/* Exam Readiness Indicator - Always visible */}
        <div className={`mb-8 rounded-2xl p-6 border-2 ${
          examReadiness.isReady
            ? 'bg-green-500/20 border-green-500'
            : examReadiness.consecutiveQualifying === 1
              ? 'bg-amber-500/10 border-amber-500/50'
              : 'bg-blue-500/10 border-blue-500/50'
        }`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl ${
              examReadiness.isReady
                ? 'bg-green-500'
                : examReadiness.consecutiveQualifying === 1
                  ? 'bg-amber-500'
                  : 'bg-blue-500'
            }`}>
              {examReadiness.isReady ? '✅' : examReadiness.consecutiveQualifying === 1 ? '⏳' : '🎯'}
            </div>
            <div>
              <h3 className={`text-2xl font-black ${
                examReadiness.isReady
                  ? 'text-green-400'
                  : examReadiness.consecutiveQualifying === 1
                    ? 'text-amber-400'
                    : 'text-blue-400'
              }`}>
                {examReadiness.isReady
                  ? 'Prüfungsbereit!'
                  : examReadiness.consecutiveQualifying === 1
                    ? 'Noch 1 Exam nötig!'
                    : 'Prüfungsbereitschaft'}
              </h3>
              <p className="text-gray-300 text-sm">
                {examReadiness.isReady
                  ? 'Du hast 2x in Folge mit 130+ Fragen und 90%+ bestanden!'
                  : examReadiness.consecutiveQualifying === 1
                    ? 'Noch 1 weiteres Exam mit 130+ Fragen und 90%+ nötig'
                    : 'Bestehe 2 Exams in Folge mit 130+ Fragen und 90%+'}
              </p>
            </div>
          </div>

          {/* Progress: 2 Boxes for consecutive exams */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Exam 1 Status */}
            <div className={`rounded-xl p-4 border ${
              examReadiness.consecutiveQualifying >= 1
                ? 'bg-green-500/20 border-green-500/50'
                : 'bg-gray-800/50 border-gray-600'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">Exam 1 von 2</span>
                <span className={`font-bold ${
                  examReadiness.consecutiveQualifying >= 1 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {examReadiness.consecutiveQualifying >= 1 ? '✓ Bestanden' : 'Ausstehend'}
                </span>
              </div>
              {examReadiness.lastTwoExams.length >= 2 && examReadiness.lastTwoExams[1]?.passed ? (
                <p className="text-gray-400 text-xs">
                  {examReadiness.lastTwoExams[1].totalQuestions} Fragen • {examReadiness.lastTwoExams[1].percentage}%
                </p>
              ) : examReadiness.lastTwoExams.length >= 1 && examReadiness.lastTwoExams[0]?.passed ? (
                <p className="text-gray-400 text-xs">
                  {examReadiness.lastTwoExams[0].totalQuestions} Fragen • {examReadiness.lastTwoExams[0].percentage}%
                </p>
              ) : (
                <p className="text-gray-400 text-xs">130+ Fragen mit 90%+ benötigt</p>
              )}
            </div>

            {/* Exam 2 Status */}
            <div className={`rounded-xl p-4 border ${
              examReadiness.consecutiveQualifying >= 2
                ? 'bg-green-500/20 border-green-500/50'
                : 'bg-gray-800/50 border-gray-600'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-semibold">Exam 2 von 2</span>
                <span className={`font-bold ${
                  examReadiness.consecutiveQualifying >= 2 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {examReadiness.consecutiveQualifying >= 2 ? '✓ Bestanden' : 'Ausstehend'}
                </span>
              </div>
              {examReadiness.consecutiveQualifying >= 2 && examReadiness.lastTwoExams.length >= 1 ? (
                <p className="text-gray-400 text-xs">
                  {examReadiness.lastTwoExams[0].totalQuestions} Fragen • {examReadiness.lastTwoExams[0].percentage}%
                </p>
              ) : (
                <p className="text-gray-400 text-xs">130+ Fragen mit 90%+ benötigt</p>
              )}
            </div>
          </div>

          {/* Ready message or explanation */}
          {examReadiness.isReady ? (
            <div className="mt-4 text-center">
              <p className="text-green-300 font-semibold">
                🎉 Herzlichen Glückwunsch! Du bist bereit für die echte CCNA-Prüfung!
              </p>
            </div>
          ) : (
            <div className="mt-4 p-3 bg-gray-800/50 rounded-xl">
              <p className="text-gray-300 text-sm text-center">
                <strong className="text-blue-400">Kriterien:</strong> 2 Exams in Folge mit jeweils mind. 130 Fragen und 90%+ Genauigkeit
              </p>
            </div>
          )}
        </div>

        {/* Mode Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Exam Mode */}
          <div className="bg-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-600 hover:border-blue-500" onClick={onStartExam}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-3xl">
                📝
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">Exam Mode</h2>
                <span className="inline-block bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full mt-1 border border-blue-500/30">
                  TIMED • 120 MIN
                </span>
              </div>
            </div>

            <p className="text-gray-300 text-lg mb-6">
              Full exam simulation with 100 questions. Timer and instant scoring.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Real exam experience</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Instant results</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Pass/Fail indicator</span>
              </div>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors text-lg">
              Start Exam →
            </button>
          </div>

          {/* Practice Mode */}
          <div className="bg-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-600 hover:border-green-500" onClick={onStartPractice}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center text-3xl">
                📚
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">Practice Mode</h2>
                <span className="inline-block bg-green-500/20 text-green-300 text-xs font-bold px-3 py-1 rounded-full mt-1 border border-green-500/30">
                  LEARN AT YOUR PACE
                </span>
              </div>
            </div>

            <p className="text-gray-300 text-lg mb-6">
              Study by topic with instant feedback and explanations.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Topic-based learning</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Instant explanations</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Progress tracking</span>
              </div>
            </div>

            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-colors text-lg">
              Start Practice →
            </button>
          </div>

          {/* Subnetting Mode */}
          <div className="bg-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-600 hover:border-indigo-500" onClick={onStartSubnetting}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center text-3xl">
                🔢
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">Subnetting</h2>
                <span className="inline-block bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full mt-1 border border-indigo-500/30">
                  CALCULATIONS
                </span>
              </div>
            </div>

            <p className="text-gray-300 text-lg mb-6">
              Practice subnetting calculations with instant feedback.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Network address calculations</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>CIDR notation practice</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Host range identification</span>
              </div>
            </div>

            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors text-lg">
              Start Subnetting →
            </button>
          </div>

          {/* Smart Practice Mode */}
          <div className="bg-gray-700 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-600 hover:border-violet-500" onClick={onStartSmartPractice}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-violet-600 rounded-xl flex items-center justify-center text-3xl">
                🧠
              </div>
              <div>
                <h2 className="text-3xl font-black text-white">Smart Practice</h2>
                <span className="inline-block bg-violet-500/20 text-violet-300 text-xs font-bold px-3 py-1 rounded-full mt-1 border border-violet-500/30">
                  SPACED REPETITION
                </span>
              </div>
            </div>

            <p className="text-gray-300 text-lg mb-6">
              AI-powered learning with SM-2 algorithm for optimal retention.
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Adaptive difficulty</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Focus on weak areas</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span className="text-green-400 text-xl">✓</span>
                <span>Optimized review schedule</span>
              </div>
            </div>

            <button className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 rounded-xl transition-colors text-lg">
              Start Smart Practice →
            </button>
          </div>
        </div>

        {/* Topics */}
        <div className="bg-gray-700 rounded-2xl p-8 shadow-sm border border-gray-600">
          <h3 className="text-3xl font-black text-white mb-6 text-center">Exam Topics</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: 'Network Fundamentals', percent: '20%', color: 'blue', bgClass: 'bg-blue-500', borderClass: 'border-blue-600' },
              { name: 'Network Access', percent: '20%', color: 'purple', bgClass: 'bg-purple-500', borderClass: 'border-purple-600' },
              { name: 'IP Connectivity', percent: '25%', color: 'green', bgClass: 'bg-green-500', borderClass: 'border-green-600' },
              { name: 'IP Services', percent: '10%', color: 'amber', bgClass: 'bg-amber-500', borderClass: 'border-amber-600' },
              { name: 'Security Fundamentals', percent: '15%', color: 'red', bgClass: 'bg-red-500', borderClass: 'border-red-600' },
              { name: 'Automation & Programmability', percent: '10%', color: 'indigo', bgClass: 'bg-indigo-500', borderClass: 'border-indigo-600' },
            ].map((topic) => (
              <div key={topic.name} className="flex items-center justify-between p-4 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors border border-gray-600">
                <span className="font-bold text-white">{topic.name}</span>
                <span className={`font-bold text-white ${topic.bgClass} px-3 py-1 rounded-lg text-sm border ${topic.borderClass}`}>
                  {topic.percent}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
