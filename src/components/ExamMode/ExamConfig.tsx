import { useState, useMemo, useEffect } from 'react';

interface ExamConfigProps {
  onStart: (config: ExamConfiguration) => void;
  onCancel: () => void;
}

export interface ExamConfiguration {
  questionCount: number;
  totalTime: number; // in minutes
}

export default function ExamConfig({ onStart, onCancel }: ExamConfigProps) {
  const [questionCount, setQuestionCount] = useState(100);
  const [totalTime, setTotalTime] = useState(100); // 100 questions × 1 min

  // Calculate recommended time based on question count
  // Formula: 1/3 easy (0.5min), 1/3 medium (1min), 1/3 hard (1.5min) = avg 1 min/question
  const recommendedTime = useMemo(() => {
    return questionCount;
  }, [questionCount]);

  // Auto-update time when question count changes
  useEffect(() => {
    setTotalTime(recommendedTime);
  }, [recommendedTime]);

  const handleStart = () => {
    onStart({
      questionCount,
      totalTime
    });
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-2xl w-full border border-white/20 shadow-2xl">
        <h1 className="text-4xl font-black text-white mb-2">Exam Configuration</h1>
        <p className="text-white/80 mb-8">Configure your CCNA practice exam</p>

        <div className="space-y-6">
          {/* Question Count */}
          <div>
            <label className="block text-white font-bold mb-2">
              Number of Questions
            </label>
            <div className="flex gap-4 items-center">
              <input
                type="range"
                min="10"
                max="529"
                step="10"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="flex-1 h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min="10"
                max="529"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                className="w-24 px-4 py-2 bg-white/20 text-white rounded-xl border border-white/30 focus:border-white/60 focus:outline-none font-bold text-center"
              />
            </div>
            <p className="text-white/60 text-sm mt-2">Standard CCNA exam: 100-120 questions</p>
          </div>

          {/* Total Time Slider */}
          <div>
            <label className="block text-white font-bold mb-2">
              Total Exam Time (Minutes)
            </label>
            <div className="flex gap-4 items-center">
              <input
                type="range"
                min="10"
                max="500"
                step="5"
                value={totalTime}
                onChange={(e) => setTotalTime(parseInt(e.target.value))}
                className="flex-1 h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min="10"
                max="500"
                value={totalTime}
                onChange={(e) => setTotalTime(parseInt(e.target.value))}
                className="w-24 px-4 py-2 bg-white/20 text-white rounded-xl border border-white/30 focus:border-white/60 focus:outline-none font-bold text-center"
              />
            </div>
            <p className="text-white/60 text-sm mt-2">
              Empfohlen: {recommendedTime} min ({questionCount} Fragen × 1 min Ø)
            </p>
          </div>

          {/* Time Breakdown Info */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-white font-bold mb-4">Time Allocation per Difficulty</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-white/80">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Easy Questions (1/3)</span>
                </div>
                <span className="font-bold">0,5 min/question</span>
              </div>
              <div className="flex items-center justify-between text-white/80">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span>Medium Questions (1/3)</span>
                </div>
                <span className="font-bold">1,0 min/question</span>
              </div>
              <div className="flex items-center justify-between text-white/80">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Hard Questions (1/3)</span>
                </div>
                <span className="font-bold">1,5 min/question</span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-xl border border-white/30 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black py-4 px-6 rounded-xl shadow-xl transform hover:scale-105 transition-all"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
