import { useState, useEffect } from 'react';

type View = 'home' | 'exam' | 'practice' | 'subnetting' | 'smartPractice' | 'progress' | 'questionDatabase' | 'admin';

interface SidebarProps {
  currentView: View;
  onNavigate: (view: View) => void;
}

interface ReadinessLevel {
  level: number;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const READINESS_LEVELS: ReadinessLevel[] = [
  { level: 0, label: 'Einsteiger', icon: '🌱', color: 'text-gray-400', description: 'Starte dein erstes Exam' },
  { level: 1, label: 'Lernend', icon: '📖', color: 'text-blue-400', description: 'Erreiche 60% Durchschnitt' },
  { level: 2, label: 'Fortgeschritten', icon: '📈', color: 'text-purple-400', description: 'Erreiche 75% Durchschnitt' },
  { level: 3, label: 'Fast bereit', icon: '🎯', color: 'text-amber-400', description: '1x 130+ Fragen mit 90%+' },
  { level: 4, label: 'Exam-Ready!', icon: '🎓', color: 'text-green-400', description: '2x in Folge 130+ mit 90%+' },
];

export default function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const [readinessLevel, setReadinessLevel] = useState<ReadinessLevel>(READINESS_LEVELS[0]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [debugInfo, setDebugInfo] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    calculateReadiness();
    loadQuestionStats();
    // Re-check every 5 seconds for updates
    const interval = setInterval(calculateReadiness, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadQuestionStats = async () => {
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

      const questions = data.questions || [];
      setQuestionCount(questions.length);

      // Count questions per topic
      const counts: Record<string, number> = {};
      questions.forEach((q: any) => {
        counts[q.topic] = (counts[q.topic] || 0) + 1;
      });
      setTopicCounts(counts);
    } catch (error) {
      console.error('Error loading question stats:', error);
    }
  };

  const calculateReadiness = () => {
    try {
      const historyJson = localStorage.getItem('examHistory');
      if (!historyJson) {
        setReadinessLevel(READINESS_LEVELS[0]);
        setProgressPercent(0);
        return;
      }

      const history = JSON.parse(historyJson);
      const entries = history.entries || [];

      if (entries.length === 0) {
        setReadinessLevel(READINESS_LEVELS[0]);
        setProgressPercent(0);
        return;
      }

      // Check for Exam-Ready: 2x consecutive with 130+ questions and 90%+
      let consecutiveQualifying = 0;
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry.totalQuestions >= 130 && entry.percentage >= 90) {
          consecutiveQualifying++;
        } else {
          break;
        }
      }

      if (consecutiveQualifying >= 2) {
        setReadinessLevel(READINESS_LEVELS[4]);
        setProgressPercent(100);
        return;
      }

      // Check for "Fast bereit": 1x with 130+ questions and 90%+
      const hasOneQualifying = entries.some(
        (e: any) => e.totalQuestions >= 130 && e.percentage >= 90
      );
      if (hasOneQualifying) {
        setReadinessLevel(READINESS_LEVELS[3]);
        // Progress: 1 of 2 qualifying exams
        setProgressPercent(50 + (consecutiveQualifying * 25));
        return;
      }

      // Calculate average percentage from actual data
      const totalQuestions = history.totalQuestionsAnswered || 0;
      const totalCorrect = history.totalCorrectAnswers || 0;
      const avgPercentage = totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

      // Set debug info
      setDebugInfo(`${totalCorrect}/${totalQuestions} = ${avgPercentage}%`);

      if (avgPercentage >= 75) {
        setReadinessLevel(READINESS_LEVELS[2]);
        // Progress towards needing a 130+ with 90%+ exam
        setProgressPercent(Math.min(100, ((avgPercentage - 75) / 15) * 100));
        return;
      }

      if (avgPercentage >= 60) {
        setReadinessLevel(READINESS_LEVELS[1]);
        // Progress towards 75%
        setProgressPercent(Math.min(100, ((avgPercentage - 60) / 15) * 100));
        return;
      }

      // Under 60% - still in learning phase
      setReadinessLevel(READINESS_LEVELS[1]);
      setProgressPercent(Math.max(5, Math.min(100, (avgPercentage / 60) * 100)));
    } catch (error) {
      console.error('Error calculating readiness:', error);
    }
  };
  const menuItems = [
    { id: 'home' as View, label: 'Home', icon: '🏠', color: 'from-blue-500 to-cyan-500' },
    { id: 'exam' as View, label: 'Exam Mode', icon: '📝', color: 'from-blue-600 to-indigo-600' },
    { id: 'practice' as View, label: 'Practice Mode', icon: '📚', color: 'from-emerald-500 to-teal-500' },
    { id: 'subnetting' as View, label: 'Subnetting', icon: '🔢', color: 'from-indigo-500 to-purple-500' },
    { id: 'smartPractice' as View, label: 'Smart Practice', icon: '🧠', color: 'from-violet-500 to-purple-500' },
    { id: 'progress' as View, label: 'Progress', icon: '📊', color: 'from-purple-500 to-pink-500' },
    { id: 'questionDatabase' as View, label: 'Fragendatenbank', icon: '💾', color: 'from-cyan-500 to-blue-500' },
    { id: 'admin' as View, label: 'Fehlerberichte', icon: '⚠️', color: 'from-orange-500 to-red-500' },
  ];

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white relative flex flex-col shadow-2xl z-50">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-cyan-600/10 pointer-events-none"></div>

      <div className="relative flex-1 p-6">
        {/* Logo/Branding */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
              <span className="text-2xl font-black text-white">C</span>
            </div>
            <div>
              <h2 className="text-2xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                CCNA Prep
              </h2>
              <p className="text-xs text-slate-400 font-medium">Exam Mastery</p>
            </div>
          </div>
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-cyan-500 to-transparent rounded-full"></div>
        </div>

        {/* Navigation */}
        <nav className="space-y-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full text-left px-4 py-4 rounded-xl transition-all duration-300 flex items-center gap-3 group relative overflow-hidden ${
                currentView === item.id
                  ? 'bg-gradient-to-r ' + item.color + ' shadow-lg shadow-' + item.color.split(' ')[1].replace('to-', '') + '/30'
                  : 'hover:bg-slate-700/70 hover:translate-x-1'
              }`}
            >
              {/* Active indicator */}
              {currentView === item.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/80 rounded-r-full"></div>
              )}

              {/* Icon and Label - Always Side by Side */}
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <span className={`text-base flex-1 ${
                currentView === item.id ? 'font-bold text-white' : 'font-medium text-gray-200 group-hover:text-white'
              }`}>
                {item.label}
              </span>

              {/* Arrow indicator for active item */}
              {currentView === item.id && (
                <span className="text-white text-sm">→</span>
              )}
            </button>
          ))}
        </nav>

        {/* Exam Readiness Tracker */}
        <div
          className="mt-8 p-4 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-all"
          onClick={() => onNavigate('progress')}
          title={debugInfo ? `Gesamt: ${debugInfo}` : 'Noch keine Daten'}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{readinessLevel.icon}</span>
              <span className={`text-sm font-bold ${readinessLevel.color}`}>
                {readinessLevel.label}
              </span>
            </div>
            {debugInfo && (
              <span className="text-xs text-slate-400 font-mono">
                {debugInfo}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-500 ${
                readinessLevel.level === 4 ? 'bg-green-500' :
                readinessLevel.level === 3 ? 'bg-amber-500' :
                readinessLevel.level === 2 ? 'bg-purple-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {readinessLevel.level < 4
              ? `Nächstes Ziel: ${READINESS_LEVELS[Math.min(readinessLevel.level + 1, 4)].description}`
              : 'Du bist bereit für das echte CCNA Exam!'}
          </p>

          {/* Level indicators */}
          <div className="flex justify-between mt-3">
            {READINESS_LEVELS.map((level) => (
              <div
                key={level.level}
                className={`w-2 h-2 rounded-full transition-all ${
                  level.level <= readinessLevel.level
                    ? level.level === 4 ? 'bg-green-500' :
                      level.level === 3 ? 'bg-amber-500' :
                      level.level === 2 ? 'bg-purple-500' :
                      'bg-blue-500'
                    : 'bg-slate-600'
                }`}
                title={level.label}
              />
            ))}
          </div>
        </div>

        {/* Question Stats */}
        <div className="mt-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300">Fragenpool</span>
            <span className="text-sm font-black text-cyan-400">{questionCount} Fragen</span>
          </div>

          {/* Topics breakdown - in official CCNA order */}
          <div className="space-y-1.5">
            {[
              'Network Fundamentals',
              'Network Access',
              'IP Connectivity',
              'IP Services',
              'Security Fundamentals',
              'Automation and Programmability'
            ].map((topic) => (
              <div key={topic} className="flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-[140px]" title={topic}>
                  {topic.replace('Fundamentals', '').replace('Automation and ', '').trim()}
                </span>
                <span className="text-slate-300 font-mono">{topicCounts[topic] || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative p-6 border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-300">Version 1.0.0</p>
            <p className="text-xs text-slate-500 mt-0.5">CCNA 200-301</p>
          </div>
          <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center border border-slate-600">
            <span className="text-xs">✨</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
