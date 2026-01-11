import { Question } from '../../types/Question';
import DragDropQuestion from './DragDropQuestion';
import MatchingQuestion from './MatchingQuestion';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswers: number[]; // For multiple-choice
  onAnswerSelect: (answerIndex: number) => void; // For multiple-choice
  showExplanation?: boolean;
  // For drag-and-drop
  dragDropAnswer?: { [itemIndex: number]: string };
  onDragDropAnswerChange?: (answer: { [itemIndex: number]: string }) => void;
  // For matching
  matchingAnswer?: { [leftId: string]: string };
  onMatchingAnswerChange?: (answer: { [leftId: string]: string }) => void;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswers,
  onAnswerSelect,
  showExplanation = false,
  dragDropAnswer,
  onDragDropAnswerChange,
  matchingAnswer,
  onMatchingAnswerChange,
}: QuestionCardProps) {
  const isMultipleChoice = question.type === 'multiple-choice-multiple';
  const isDragDrop = question.type === 'drag-and-drop';
  const isMatching = question.type === 'matching';

  // Calculate correctness based on question type
  let isCorrect = false;
  if (showExplanation) {
    if (isDragDrop && dragDropAnswer && question.dragDropData) {
      const dragAnswerEntries = Object.entries(dragDropAnswer);
      isCorrect = dragAnswerEntries.length > 0 && dragAnswerEntries.every(
        ([itemIdx, categoryId]) => question.dragDropData!.correctMapping[parseInt(itemIdx)] === categoryId
      );
    } else if (isMatching && matchingAnswer && question.matchingData) {
      const matchAnswerEntries = Object.entries(matchingAnswer);
      isCorrect = matchAnswerEntries.length > 0 && matchAnswerEntries.every(
        ([leftId, rightId]) => question.matchingData!.correctMatches[leftId] === rightId
      );
    } else if (question.correctAnswer) {
      // CRITICAL FIX: Empty answer is NEVER correct
      // User must select at least one answer, and it must match exactly
      isCorrect = selectedAnswers.length > 0 &&
        selectedAnswers.length === question.correctAnswer.length &&
        selectedAnswers.every(a => question.correctAnswer.includes(a));
    } else {
      console.error('Question missing correctAnswer:', question);
      isCorrect = false;
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-sm font-semibold text-gray-600">
            {question.topic} • {question.subtopic}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-4 py-2 rounded-lg ${
            question.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
            question.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' :
            'bg-red-100 text-red-700'
          }`}>
            {question.difficulty.toUpperCase()}
          </span>
          {isMultipleChoice && (
            <span className="text-xs font-bold px-4 py-2 rounded-lg bg-purple-100 text-purple-700">
              SELECT MULTIPLE ANSWERS
            </span>
          )}
        </div>
      </div>

      {/* Image/Diagram (shown BEFORE question) */}
      {question.image && (
        <div className="mb-8 bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
          <img
            src={question.image.type === 'base64' ? question.image.data : `/src/assets/questions/${question.image.data}`}
            alt="Network diagram"
            className="w-full max-h-96 object-contain rounded-lg"
          />
        </div>
      )}

      {/* Question */}
      <h3
        className="text-2xl font-bold text-gray-900 mb-8 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: question.question }}
      />

      {/* Question Content - Different rendering based on type */}
      {isDragDrop && question.dragDropData ? (
        <DragDropQuestion
          data={question.dragDropData}
          showExplanation={showExplanation}
          currentAnswer={dragDropAnswer}
          onAnswerChange={onDragDropAnswerChange}
        />
      ) : isMatching && question.matchingData ? (
        <MatchingQuestion
          data={question.matchingData}
          showExplanation={showExplanation}
          currentAnswer={matchingAnswer}
          onAnswerChange={onMatchingAnswerChange}
        />
      ) : (
        /* Multiple Choice Options */
        <div className="space-y-4 mb-8">
          {question.options.map((option, index) => {
          const isSelected = selectedAnswers.includes(index);
          const isCorrectAnswer = question.correctAnswer ? question.correctAnswer.includes(index) : false;

          let bgColor = 'bg-gray-50 hover:bg-gray-100';
          let borderColor = 'border-gray-200';
          let textColor = 'text-gray-900';

          if (showExplanation) {
            if (isCorrectAnswer) {
              bgColor = 'bg-green-50';
              borderColor = 'border-green-500';
              textColor = 'text-green-900';
            } else if (isSelected && !isCorrectAnswer) {
              bgColor = 'bg-red-50';
              borderColor = 'border-red-500';
              textColor = 'text-red-900';
            }
          } else if (isSelected) {
            bgColor = 'bg-blue-50';
            borderColor = 'border-blue-500';
            textColor = 'text-blue-900';
          }

          return (
            <button
              key={index}
              onClick={() => !showExplanation && onAnswerSelect(index)}
              disabled={showExplanation}
              className={`w-full text-left p-5 rounded-xl border-2 transition-all ${bgColor} ${borderColor} ${
                !showExplanation && 'hover:scale-[1.02] cursor-pointer'
              } ${showExplanation && 'cursor-default'}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white'
                  }`}>
                    {isSelected && (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`font-semibold text-lg ${textColor}`} dangerouslySetInnerHTML={{ __html: option }} />
                </div>
                {showExplanation && isCorrectAnswer && (
                  <span className="text-green-600 font-bold text-2xl">✓</span>
                )}
                {showExplanation && isSelected && !isCorrectAnswer && (
                  <span className="text-red-600 font-bold text-2xl">✗</span>
                )}
              </div>
            </button>
          );
        })}
        </div>
      )}

      {/* Explanation */}
      {showExplanation && (
        <div className={`p-6 rounded-xl border-2 ${
          isCorrect
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <h4 className={`font-bold text-xl mb-3 ${isCorrect ? 'text-green-800' : 'text-red-800'}`}>
            {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
          </h4>
          <p className="text-gray-800 text-lg mb-4 leading-relaxed" dangerouslySetInnerHTML={{ __html: question.explanation }} />
          {question.references.length > 0 && (
            <div className="text-sm text-gray-700 bg-white/50 px-4 py-3 rounded-lg">
              <strong>References:</strong> {question.references.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
