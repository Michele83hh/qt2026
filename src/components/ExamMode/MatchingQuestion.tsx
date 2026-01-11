import { useState, useEffect } from 'react';
import { MatchingData } from '../../types/Question';

interface MatchingQuestionProps {
  data: MatchingData;
  showExplanation: boolean;
  currentAnswer?: { [leftId: string]: string };
  onAnswerChange?: (answer: { [leftId: string]: string }) => void;
}

export default function MatchingQuestion({ data, showExplanation, currentAnswer, onAnswerChange }: MatchingQuestionProps) {
  const [matches, setMatches] = useState<{ [leftId: string]: string }>(currentAnswer || {});

  // Sync with external state when currentAnswer changes (e.g., navigating between questions)
  useEffect(() => {
    setMatches(currentAnswer || {});
  }, [currentAnswer]);

  useEffect(() => {
    if (onAnswerChange) {
      onAnswerChange(matches);
    }
  }, [matches]);

  const handleMatchChange = (leftId: string, rightId: string) => {
    if (!showExplanation) {
      setMatches(prev => ({
        ...prev,
        [leftId]: rightId
      }));
    }
  };

  const isCorrectMatch = (leftId: string, rightId: string) => {
    return data.correctMatches[leftId] === rightId;
  };

  const getMatchStatus = (leftId: string) => {
    const selectedRightId = matches[leftId];
    if (!selectedRightId) return null;
    return isCorrectMatch(leftId, selectedRightId);
  };

  return (
    <div className="space-y-6">
      {/* Matching Interface */}
      <div className="bg-white rounded-xl border-2 border-gray-300 overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-gray-300">
          {/* Left Column Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
            <h4 className="font-bold">Kategorien:</h4>
          </div>

          {/* Right Column Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4">
            <h4 className="font-bold">Optionen:</h4>
          </div>

          {/* Matching Rows */}
          {data.leftColumn.map((leftItem, index) => {
            const selectedRightId = matches[leftItem.id];
            const matchStatus = getMatchStatus(leftItem.id);

            return (
              <div key={leftItem.id} className="contents">
                {/* Left Item */}
                <div className={`bg-gray-50 px-6 py-4 flex items-center ${
                  showExplanation
                    ? matchStatus === true
                      ? 'bg-green-50'
                      : matchStatus === false
                      ? 'bg-red-50'
                      : 'bg-gray-50'
                    : ''
                }`}>
                  <div className="flex items-center gap-3 w-full">
                    <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="font-semibold text-gray-900 flex-1">
                      {leftItem.label}
                    </span>
                    {showExplanation && matchStatus !== null && (
                      <span className={`text-xl ${matchStatus ? 'text-green-600' : 'text-red-600'}`}>
                        {matchStatus ? '✓' : '✗'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Item Selector */}
                <div className={`bg-white px-6 py-4 ${
                  showExplanation
                    ? matchStatus === true
                      ? 'bg-green-50'
                      : matchStatus === false
                      ? 'bg-red-50'
                      : 'bg-white'
                    : ''
                }`}>
                  <select
                    value={selectedRightId || ''}
                    onChange={(e) => handleMatchChange(leftItem.id, e.target.value)}
                    disabled={showExplanation}
                    className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none ${
                      showExplanation
                        ? matchStatus === true
                          ? 'border-green-500 bg-green-50'
                          : matchStatus === false
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-300 bg-gray-50'
                        : 'border-gray-300 focus:border-blue-500'
                    } ${!showExplanation ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <option value="">-- Wähle eine Option --</option>
                    {data.rightColumn.map((rightItem) => (
                      <option key={rightItem.id} value={rightItem.id}>
                        {rightItem.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Table (only in explanation mode) */}
      {showExplanation && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h4 className="font-bold text-blue-900 mb-4">Korrekte Zuordnung:</h4>
          <div className="bg-white rounded-lg overflow-hidden border border-blue-300">
            <table className="w-full">
              <thead className="bg-blue-100">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-blue-900">Kategorie</th>
                  <th className="px-4 py-3 text-left font-bold text-blue-900">Korrekte Option</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200">
                {data.leftColumn.map((leftItem) => {
                  const correctRightId = data.correctMatches[leftItem.id];
                  const correctRightItem = data.rightColumn.find(r => r.id === correctRightId);

                  return (
                    <tr key={leftItem.id} className="hover:bg-blue-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{leftItem.label}</td>
                      <td className="px-4 py-3 text-gray-800">{correctRightItem?.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
