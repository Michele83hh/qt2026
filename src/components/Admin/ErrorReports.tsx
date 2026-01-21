import { useState, useEffect } from 'react';
import { QuestionReport } from '../../types/questions';
import { Question } from '../../types/Question';
import QuestionEditModal from './QuestionEditModal';
import { notify, confirm as customConfirm } from '../../store/notificationStore';

export default function ErrorReports() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Map<string, Question>>(new Map());

  useEffect(() => {
    loadReports();
    loadQuestions();
  }, []);

  const loadReports = () => {
    const reportsJson = localStorage.getItem('questionReports');
    if (reportsJson) {
      const loadedReports = JSON.parse(reportsJson);
      setReports(loadedReports);
    }
  };

  const loadQuestions = async () => {
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

      const questionsMap = new Map<string, Question>();

      // Questions are already in the correct format
      data.questions.forEach((q: Question) => {
        questionsMap.set(q.id, q);
      });

      setQuestions(questionsMap);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const deleteReport = (reportId: string) => {
    const updatedReports = reports.filter(r => r.id !== reportId);
    localStorage.setItem('questionReports', JSON.stringify(updatedReports));
    setReports(updatedReports);
  };

  const openEditModal = (questionId: string, reportId: string) => {
    setEditingQuestionId(questionId);
    setEditingReportId(reportId);
  };

  const closeEditModal = () => {
    setEditingQuestionId(null);
    setEditingReportId(null);
  };

  const handleSaveQuestion = async (updatedQuestion: Question) => {
    try {
      // Check if running in Tauri (Desktop app)
      const isTauri = '__TAURI_INTERNALS__' in window;

      let data: any;

      if (isTauri) {
        // Import Tauri invoke function
        const { invoke } = await import('@tauri-apps/api/core');

        // Read current questions from file using Tauri
        const questionsJson = await invoke<string>('read_questions');
        data = JSON.parse(questionsJson);
      } else {
        // Fallback for browser mode
        const response = await fetch('/src/data/questions.json');
        data = await response.json();
      }

      // Update the question in the array (already in correct format)
      const updatedQuestions = data.questions.map((q: Question) =>
        q.id === updatedQuestion.id ? updatedQuestion : q
      );

      // Update data object
      data.questions = updatedQuestions;
      data.lastUpdated = new Date().toISOString();

      if (isTauri) {
        // Save back to file using Tauri (Desktop app only)
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('save_questions', { questionsJson: JSON.stringify(data) });

        // Update local state
        const newQuestionsMap = new Map(questions);
        newQuestionsMap.set(updatedQuestion.id, updatedQuestion);
        setQuestions(newQuestionsMap);

        // Mark report as resolved
        if (editingReportId) {
          markReportResolved(editingReportId);
        }

        notify.success('Frage wurde erfolgreich in der Datei gespeichert und als erledigt markiert!\n\nBitte lade die App neu (F5), damit die Änderungen überall sichtbar werden.');
        closeEditModal();

        // Reload questions to show updated data
        await loadQuestions();
      } else {
        // Browser mode - can't save to file, only update local state
        const newQuestionsMap = new Map(questions);
        newQuestionsMap.set(updatedQuestion.id, updatedQuestion);
        setQuestions(newQuestionsMap);

        if (editingReportId) {
          markReportResolved(editingReportId);
        }

        notify.warning('⚠️ Browser-Modus: Änderungen können nicht gespeichert werden!\n\nÖffne die Desktop-App (Tauri) um Änderungen dauerhaft zu speichern.\n\nDie Änderungen sind nur in dieser Session sichtbar.');
        closeEditModal();
      }
    } catch (error) {
      console.error('Error saving question:', error);
      notify.error('Fehler beim Speichern der Frage: ' + error);
    }
  };

  const markReportResolved = (reportId: string) => {
    const updatedReports = reports.map(r =>
      r.id === reportId ? { ...r, status: 'fixed' as const } : r
    );
    localStorage.setItem('questionReports', JSON.stringify(updatedReports));
    setReports(updatedReports);
  };

  const handleMarkResolvedOnly = () => {
    if (editingReportId) {
      markReportResolved(editingReportId);
      notify.success('Fehlerbericht als erledigt markiert (ohne Änderungen)');
      closeEditModal();
    }
  };

  const exportReports = async () => {
    try {
      const dataStr = JSON.stringify(reports, null, 2);
      const isTauri = '__TAURI_INTERNALS__' in window;

      if (isTauri) {
        // Use Tauri save dialog
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');

        const filePath = await save({
          filters: [{
            name: 'JSON',
            extensions: ['json']
          }],
          defaultPath: `error-reports-${new Date().toISOString().split('T')[0]}.json`
        });

        if (filePath) {
          await writeTextFile(filePath, dataStr);
          notify.success('Fehlerberichte erfolgreich exportiert!');
        }
      } else {
        // Browser fallback: Blob download
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `error-reports-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        notify.success('Fehlerberichte erfolgreich exportiert!');
      }
    } catch (error) {
      console.error('Export error:', error);
      notify.error('Fehler beim Exportieren: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'question_text_error': 'Fehler im Fragetext',
      'option_text_error': 'Fehler in Antwortoption',
      'wrong_correct_answer': 'Falsche korrekte Antwort',
      'explanation_error': 'Fehler in Erklärung',
      'typo': 'Tippfehler',
      'wrong_answer': 'Falsche Antwort',
      'unclear': 'Unklar formuliert',
      'missing_info': 'Fehlende Information',
      'other': 'Sonstiges'
    };
    return labels[type] || type;
  };

  // Strip HTML tags for plain text preview
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  // Truncate text to a certain length
  const truncateText = (text: string, maxLength: number): string => {
    const stripped = stripHtml(text);
    return stripped.length > maxLength
      ? stripped.substring(0, maxLength) + '...'
      : stripped;
  };

  return (
    <div className="min-h-full bg-gray-800 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">Fehlerberichte</h1>
              <p className="text-gray-400">
                Übersicht aller gemeldeten Fehler in den Prüfungsfragen
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={loadReports}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <span>🔄</span>
                <span>Aktualisieren</span>
              </button>
              <button
                onClick={exportReports}
                disabled={reports.length === 0}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <span>📥</span>
                <span>Export Berichte</span>
              </button>
              <button
                onClick={() => {
                  const resolvedCount = reports.filter(r => r.status === 'fixed').length;
                  if (resolvedCount === 0) {
                    notify.info('Keine erledigten Berichte zum Verwerfen vorhanden.');
                    return;
                  }
                  customConfirm(
                    `Möchtest du alle ${resolvedCount} erledigten Berichte endgültig verwerfen?`,
                    () => {
                      const updatedReports = reports.filter(r => r.status !== 'fixed');
                      localStorage.setItem('questionReports', JSON.stringify(updatedReports));
                      setReports(updatedReports);
                      notify.success(`${resolvedCount} erledigte Berichte wurden verworfen.`);
                    },
                    {
                      title: 'Erledigte Berichte verwerfen',
                      confirmText: 'Alle erledigten verwerfen',
                      cancelText: 'Abbrechen',
                      type: 'danger'
                    }
                  );
                }}
                disabled={reports.filter(r => r.status === 'fixed').length === 0}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <span>🗑️</span>
                <span>Erledigte verwerfen ({reports.filter(r => r.status === 'fixed').length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="overflow-x-auto mb-8">
          <div className="grid grid-cols-3 gap-6 min-w-max">
            <div className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-600 text-center min-w-[200px]">
              <div className="text-4xl font-black text-blue-400 mb-2">
                {reports.length}
              </div>
              <div className="text-gray-300 font-semibold whitespace-nowrap">Gesamt Berichte</div>
            </div>
            <div className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-600 text-center min-w-[200px]">
              <div className="text-4xl font-black text-amber-400 mb-2">
                {reports.filter(r => r.status === 'pending').length}
              </div>
              <div className="text-gray-300 font-semibold whitespace-nowrap">Ausstehend</div>
            </div>
            <div className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-600 text-center min-w-[200px]">
              <div className="text-4xl font-black text-green-400 mb-2">
                {reports.filter(r => r.status === 'fixed').length}
              </div>
              <div className="text-gray-300 font-semibold whitespace-nowrap">Behoben</div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <div className="bg-gray-700 rounded-2xl p-12 border border-gray-600 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-2xl font-bold text-white mb-2">Keine Fehlerberichte</h3>
            <p className="text-gray-400">
              Es wurden noch keine Fehler gemeldet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const question = questions.get(report.questionId);
              const questionPreviewText = question && question.question
                ? truncateText(question.question, 150)
                : `Frage-ID: ${report.questionId}`;

              const isResolved = report.status === 'fixed';

              return (
                <div
                  key={report.id}
                  onClick={() => openEditModal(report.questionId, report.id)}
                  className={`rounded-xl p-6 border transition-all cursor-pointer ${
                    isResolved
                      ? 'bg-green-900/20 border-green-700/50 opacity-70 hover:opacity-100'
                      : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-bold border border-blue-600">
                          {report.questionId.substring(0, 8)}...
                        </span>
                        <span className="bg-purple-500 text-white px-3 py-1 rounded-lg text-sm font-bold border border-purple-600">
                          {getReportTypeLabel(report.reportType)}
                        </span>
                        <span className="bg-amber-500 text-white px-3 py-1 rounded-lg text-sm font-bold border border-amber-600">
                          {report.target === 'question' ? 'Frage' :
                           report.target === 'option' ? `Option ${report.targetIndex !== undefined ? report.targetIndex + 1 : ''}` :
                           report.target === 'answer' ? 'Antwort' :
                           report.target === 'explanation' ? 'Erklärung' : report.target}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${
                          report.status === 'pending'
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-green-500 text-white border-green-600'
                        }`}>
                          {report.status === 'pending' ? 'Ausstehend' : 'Behoben'}
                        </span>
                      </div>
                      <div className="text-gray-400 text-sm mb-3">
                        Gemeldet am: {new Date(report.reportedAt).toLocaleString('de-DE')}
                      </div>

                      {/* Question Preview with HTML rendering */}
                      <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <strong className="text-white">Frage:</strong>
                          <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-0.5 rounded">Vorschau</span>
                        </div>
                        {question && question.question ? (
                          <div
                            className="text-gray-300 italic report-preview"
                            dangerouslySetInnerHTML={{ __html: question.question }}
                          />
                        ) : (
                          <p className="text-gray-500 italic">{questionPreviewText}</p>
                        )}
                      </div>

                      {report.description && (
                        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
                          <strong className="text-white block mb-2">Fehlerbeschreibung:</strong>
                          <p className="text-gray-300">{report.description}</p>
                        </div>
                      )}
                      <div className="mt-3 text-blue-400 text-sm font-semibold">
                        💡 Klicken zum Bearbeiten
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        customConfirm(
                          'Möchtest du diesen Fehlerbericht wirklich verwerfen? (Nur wenn der Bericht selbst ungültig ist)',
                          () => deleteReport(report.id),
                          {
                            title: 'Fehlerbericht verwerfen',
                            confirmText: 'Verwerfen',
                            cancelText: 'Abbrechen',
                            type: 'danger'
                          }
                        );
                      }}
                      className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg font-semibold transition-all ml-4"
                    >
                      🗑️ Verwerfen
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Styles for HTML preview in reports */}
        <style>{`
          .report-preview h3 {
            font-size: 1.25rem;
            font-weight: bold;
            margin: 0.5rem 0;
          }
          .report-preview h4 {
            font-size: 1.1rem;
            font-weight: bold;
            margin: 0.5rem 0;
          }
          .report-preview p {
            margin: 0.5rem 0;
          }
          .report-preview ul {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
            list-style-type: disc;
          }
          .report-preview ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
            list-style-type: decimal;
          }
          .report-preview li {
            margin: 0.25rem 0;
          }
          .report-preview b, .report-preview strong {
            font-weight: bold;
          }
          .report-preview i, .report-preview em {
            font-style: italic;
          }
          .report-preview u {
            text-decoration: underline;
          }
        `}</style>

        {/* Edit Modal */}
        {editingQuestionId && (
          <QuestionEditModal
            questionId={editingQuestionId}
            onClose={closeEditModal}
            onSave={handleSaveQuestion}
            onMarkResolved={handleMarkResolvedOnly}
          />
        )}
      </div>
    </div>
  );
}
