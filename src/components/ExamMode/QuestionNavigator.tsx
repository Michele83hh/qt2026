import React from 'react';

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: Set<number>;
  correctAnswers?: Map<number, boolean>; // Only available after submit
  onNavigate: (questionIndex: number) => void;
  isSubmitted: boolean;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  correctAnswers,
  onNavigate,
  isSubmitted
}) => {
  const getButtonClass = (index: number) => {
    const baseClass = "px-3 py-1.5 text-sm font-medium rounded transition-all duration-200 border";
    const isCurrent = index === currentQuestion;

    // After submission - show results
    if (isSubmitted && correctAnswers) {
      const isCorrect = correctAnswers.get(index);
      if (isCorrect === true) {
        // Correct answer - with current highlighting
        if (isCurrent) {
          return `${baseClass} bg-green-200 border-green-500 border-2 text-green-900 font-bold shadow-md`;
        }
        return `${baseClass} bg-green-50 border-green-200 text-green-700 hover:bg-green-100`;
      } else if (isCorrect === false) {
        // Wrong answer - with current highlighting
        if (isCurrent) {
          return `${baseClass} bg-red-200 border-red-500 border-2 text-red-900 font-bold shadow-md`;
        }
        return `${baseClass} bg-red-50 border-red-200 text-red-700 hover:bg-red-100`;
      }
    }

    // During exam - show status
    const isAnswered = answeredQuestions.has(index);

    if (isCurrent) {
      // Current question - filled blue background
      return `${baseClass} bg-blue-100 border-2 border-blue-500 text-blue-700 font-bold`;
    } else if (isAnswered) {
      // Answered question - light gray
      return `${baseClass} bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200`;
    } else {
      // Unanswered question - neutral
      return `${baseClass} bg-white border-gray-200 text-gray-600 hover:bg-gray-50`;
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {Array.from({ length: totalQuestions }, (_, i) => (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              className={getButtonClass(i)}
              title={`Frage ${i + 1}${answeredQuestions.has(i) ? ' (beantwortet)' : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <span>
            Frage {currentQuestion + 1} von {totalQuestions}
          </span>
          <span>
            {answeredQuestions.size}/{totalQuestions} beantwortet
          </span>
        </div>
      </div>
    </div>
  );
};
