import { useState, useEffect } from 'react';
import { Question } from '../../types/Question';
import { notify } from '../../store/notificationStore';
import RichTextEditor from '../UI/RichTextEditor';

interface QuestionEditModalProps {
  questionId: string;
  onClose: () => void;
  onSave: (updatedQuestion: Question) => void;
  onMarkResolved: () => void;
}

export default function QuestionEditModal({
  questionId,
  onClose,
  onSave,
  onMarkResolved
}: QuestionEditModalProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestion();
  }, [questionId]);

  const loadQuestion = async () => {
    try {
      // Check if running in Tauri (Desktop app)
      const isTauri = '__TAURI_INTERNALS__' in window;
      let data: any;

      if (isTauri) {
        // Load from file using Tauri
        const { invoke } = await import('@tauri-apps/api/core');
        const questionsJson = await invoke<string>('read_questions');
        data = JSON.parse(questionsJson);
      } else {
        // Load from questions.json in browser mode
        const response = await fetch('/src/data/questions.json');
        data = await response.json();
      }

      const foundQuestion = data.questions.find((q: any) => q.id === questionId);

      if (foundQuestion) {
        // Question is already in the correct format
        setQuestion(foundQuestion);
      } else {
        notify.error('Frage nicht gefunden!');
        onClose();
      }
    } catch (error) {
      console.error('Error loading question:', error);
      notify.error('Fehler beim Laden der Frage: ' + (error instanceof Error ? error.message : String(error)));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (question) {
      onSave(question);
    }
  };

  const updateQuestion = (field: keyof Question, value: any) => {
    if (question) {
      setQuestion({ ...question, [field]: value });
    }
  };

  const updateOption = (index: number, value: string) => {
    if (question) {
      const newOptions = [...question.options];
      newOptions[index] = value;
      setQuestion({ ...question, options: newOptions });
    }
  };

  const toggleCorrectAnswer = (index: number) => {
    if (!question) return;

    const newCorrectAnswer = [...question.correctAnswer];
    const indexPos = newCorrectAnswer.indexOf(index);

    if (indexPos > -1) {
      newCorrectAnswer.splice(indexPos, 1);
    } else {
      if (question.type === 'multiple-choice-single') {
        // Single choice: replace
        newCorrectAnswer.length = 0;
        newCorrectAnswer.push(index);
      } else {
        // Multiple choice: add
        newCorrectAnswer.push(index);
      }
    }

    setQuestion({ ...question, correctAnswer: newCorrectAnswer });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade Frage...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">Frage bearbeiten</h2>
              <p className="text-blue-100 text-sm mt-1">ID: {question.id}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Question Type */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Fragetyp
            </label>
            <select
              value={question.type}
              onChange={(e) => updateQuestion('type', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="multiple-choice-single">Multiple Choice (Einzelauswahl)</option>
              <option value="multiple-choice-multiple">Multiple Choice (Mehrfachauswahl)</option>
              <option value="drag-and-drop">Drag & Drop (Zuordnung)</option>
              <option value="matching">Matching (Paare zuordnen)</option>
              <option value="ordering">Sortierung (Reihenfolge)</option>
            </select>
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ Achtung: Beim Ändern des Fragetyps müssen ggf. auch die Antwortoptionen angepasst werden!
            </p>
          </div>

          {/* Question Text */}
          <RichTextEditor
            label="Fragetext"
            value={question.question}
            onChange={(value) => updateQuestion('question', value)}
            minHeight="100px"
            showPreview={true}
            previewLabel="Vorschau (so sieht es im Exam aus)"
          />

          {/* Options */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Antwortoptionen (Klicke auf ✓ um richtige Antwort zu markieren)
            </label>
            <div className="space-y-4">
              {question.options.map((option, index) => (
                <div key={index} className="border-2 border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="flex items-start gap-3 mb-2">
                    <button
                      onClick={() => toggleCorrectAnswer(index)}
                      className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                        question.correctAnswer.includes(index)
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-gray-300 text-gray-400 hover:border-green-500'
                      }`}
                    >
                      {question.correctAnswer.includes(index) ? '✓' : String.fromCharCode(65 + index)}
                    </button>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none bg-white"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                  {/* Option Preview */}
                  {option && option.includes('<') && (
                    <div className="ml-13 pl-13 border-l-2 border-blue-300 ml-[52px]">
                      <div className="text-xs text-blue-600 font-semibold mb-1">Vorschau:</div>
                      <div
                        className="text-gray-700 bg-white p-2 rounded-lg border border-gray-200 option-preview"
                        dangerouslySetInnerHTML={{ __html: option }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Styles for option preview */}
          <style>{`
            .option-preview b, .option-preview strong { font-weight: bold; }
            .option-preview i, .option-preview em { font-style: italic; }
            .option-preview u { text-decoration: underline; }
            .option-preview ul { list-style-type: disc; padding-left: 1.5rem; }
            .option-preview ol { list-style-type: decimal; padding-left: 1.5rem; }
          `}</style>

          {/* Explanation */}
          <RichTextEditor
            label="Erklärung"
            value={question.explanation}
            onChange={(value) => updateQuestion('explanation', value)}
            minHeight="120px"
            showPreview={true}
            previewLabel="Vorschau der Erklärung"
          />

          {/* Topic and Difficulty */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Topic
              </label>
              <input
                type="text"
                value={question.topic}
                onChange={(e) => updateQuestion('topic', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Subtopic
              </label>
              <input
                type="text"
                value={question.subtopic}
                onChange={(e) => updateQuestion('subtopic', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Schwierigkeit
            </label>
            <select
              value={question.difficulty}
              onChange={(e) => updateQuestion('difficulty', e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* References */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Referenzen (kommagetrennt)
            </label>
            <input
              type="text"
              value={question.references.join(', ')}
              onChange={(e) => updateQuestion('references', e.target.value.split(',').map(r => r.trim()))}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
              placeholder="Topic 1.8.0, RFC 2616"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 p-6 rounded-b-2xl flex gap-3 justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
          >
            Abbrechen (bleibt fehlerhaft)
          </button>
          <button
            onClick={onMarkResolved}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-xl transition-all"
          >
            Als erledigt markieren (ohne Änderung)
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg"
          >
            Speichern & Als erledigt markieren
          </button>
        </div>
      </div>
    </div>
  );
}
