import React, { useState } from 'react';
import { ReportTarget, QuestionReport } from '../../types/questions';

interface ErrorReportModalProps {
  questionId: string;
  questionNumber: number;
  onClose: () => void;
  onSubmit: (report: Omit<QuestionReport, 'id' | 'reportedAt' | 'status'>) => void;
}

export const ErrorReportModal: React.FC<ErrorReportModalProps> = ({
  questionId,
  questionNumber,
  onClose,
  onSubmit
}) => {
  const [target, setTarget] = useState<ReportTarget>('question');
  const [targetIndex, setTargetIndex] = useState<number>(0);
  const [reportType, setReportType] = useState<QuestionReport['reportType']>('typo');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      questionId,
      target,
      targetIndex: target === 'option' ? targetIndex : undefined,
      reportType,
      description,
      originalValue: '' // Will be filled by the handler
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Fehler melden</h3>
        <p className="text-gray-600 mb-6">Frage #{questionNumber}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* What is wrong? */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Was ist fehlerhaft?
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  name="target"
                  value="question"
                  checked={target === 'question'}
                  onChange={(e) => setTarget(e.target.value as ReportTarget)}
                  className="text-blue-600"
                />
                <span className="text-gray-900">Die Frage selbst (Tippfehler, unklar)</span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  name="target"
                  value="option"
                  checked={target === 'option'}
                  onChange={(e) => setTarget(e.target.value as ReportTarget)}
                  className="text-blue-600"
                />
                <span className="text-gray-900">Eine Antwortoption</span>
              </label>

              {target === 'option' && (
                <div className="ml-8">
                  <label className="block text-sm text-gray-600 mb-1">Welche Option?</label>
                  <select
                    value={targetIndex}
                    onChange={(e) => setTargetIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>Option A (1)</option>
                    <option value={1}>Option B (2)</option>
                    <option value={2}>Option C (3)</option>
                    <option value={3}>Option D (4)</option>
                    <option value={4}>Option E (5)</option>
                  </select>
                </div>
              )}

              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  name="target"
                  value="answer"
                  checked={target === 'answer'}
                  onChange={(e) => setTarget(e.target.value as ReportTarget)}
                  className="text-blue-600"
                />
                <span className="text-gray-900">Die korrekte Antwort ist falsch markiert</span>
              </label>

              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  name="target"
                  value="explanation"
                  checked={target === 'explanation'}
                  onChange={(e) => setTarget(e.target.value as ReportTarget)}
                  className="text-blue-600"
                />
                <span className="text-gray-900">Die Erklärung (unvollständig, falsch)</span>
              </label>
            </div>
          </div>

          {/* Type of error */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Art des Fehlers
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as QuestionReport['reportType'])}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="typo">Tippfehler</option>
              <option value="wrong_answer">Falsche Antwort markiert</option>
              <option value="unclear">Unklar/verwirrend formuliert</option>
              <option value="missing_info">Fehlende Information</option>
              <option value="other">Sonstiges</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Beschreibung (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bitte beschreiben Sie den Fehler genauer..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={4}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors shadow-lg"
            >
              Fehler melden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
