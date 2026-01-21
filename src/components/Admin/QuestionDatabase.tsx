import { useState, useEffect } from 'react';
import { Question as OldQuestion } from '../../types/Question';
import AddQuestionModal from './AddQuestionModal';
import ChangeLogViewer from './ChangeLogViewer';
import { notify, confirm as customConfirm } from '../../store/notificationStore';
import { addChangeLogEntry } from '../../utils/changeLogUtils';

type CategoryKey = 'network-fundamentals' | 'network-access' | 'ip-connectivity' | 'ip-services' | 'security-fundamentals' | 'automation-programmability';

const categoryToTopic: Record<CategoryKey, OldQuestion['topic']> = {
  'network-fundamentals': 'Network Fundamentals',
  'network-access': 'Network Access',
  'ip-connectivity': 'IP Connectivity',
  'ip-services': 'IP Services',
  'security-fundamentals': 'Security Fundamentals',
  'automation-programmability': 'Automation and Programmability'
};

const topicToCategory: Record<OldQuestion['topic'], CategoryKey> = {
  'Network Fundamentals': 'network-fundamentals',
  'Network Access': 'network-access',
  'IP Connectivity': 'ip-connectivity',
  'IP Services': 'ip-services',
  'Security Fundamentals': 'security-fundamentals',
  'Automation and Programmability': 'automation-programmability'
};

// Display format for questions
interface DisplayQuestion {
  id: string;
  question: string;
  category: CategoryKey;
  difficulty?: 'easy' | 'medium' | 'hard';
  type: string; // Question type
  topicReference?: string;
  image?: { type: 'base64' | 'url'; data: string; alt?: string };
  source: 'standard' | 'manual';
}

export default function QuestionDatabase() {
  const [questions, setQuestions] = useState<DisplayQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<OldQuestion | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [openedFromChangeLog, setOpenedFromChangeLog] = useState(false);
  const [filterCategory, setFilterCategory] = useState<CategoryKey | 'all'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  useEffect(() => {
    loadQuestions();
  }, []);



  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      const allQuestions: DisplayQuestion[] = [];

      // Load all questions from questions.json
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

      if (data.questions && Array.isArray(data.questions)) {
        data.questions.forEach((q: any) => {
          allQuestions.push({
            id: q.id,
            question: q.question,
            category: q.topic ? topicToCategory[q.topic as OldQuestion['topic']] : 'network-fundamentals',
            difficulty: q.difficulty,
            type: q.type || 'multiple-choice-single',
            topicReference: q.subtopic,
            image: q.image,
            source: q.source || 'standard'
          });
        });
      }

      setQuestions(allQuestions);
    } catch (error) {
      console.error('Error loading questions:', error);
      notify.error('Fehler beim Laden der Fragen!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQuestion = async (newQuestion: OldQuestion) => {
    const isTauri = '__TAURI_INTERNALS__' in window;

    if (!isTauri) {
      notify.warning('Das Hinzufügen von Fragen ist nur in der Desktop-App möglich!\n\nBitte starte die App mit: npm run tauri dev');
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const questionsJson = await invoke<string>('read_questions');
      const data = JSON.parse(questionsJson);

      // Category prefixes
      const categoryPrefixes: Record<string, string> = {
        'Network Fundamentals': 'nf',
        'Network Access': 'na',
        'IP Connectivity': 'ic',
        'IP Services': 'is',
        'Security Fundamentals': 'sf',
        'Automation and Programmability': 'ap'
      };

      // Generate ID based on category
      const prefix = categoryPrefixes[newQuestion.topic] || 'manual';

      // Find highest ID in this category
      const categoryQuestions = data.questions.filter((q: any) =>
        q.topic === newQuestion.topic
      );

      let maxNumber = 0;
      categoryQuestions.forEach((q: any) => {
        const match = q.id.match(/^[a-z]+-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });

      const newId = `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;

      // Convert to questions.json format
      const newQuestionData: any = {
        id: newId,
        source: 'manual',
        topic: newQuestion.topic,
        subtopic: newQuestion.subtopic || '',
        difficulty: newQuestion.difficulty || 'medium',
        type: newQuestion.type,
        question: newQuestion.question,
        options: newQuestion.options,
        correctAnswer: newQuestion.correctAnswer,
        explanation: newQuestion.explanation || '',
        references: newQuestion.references || [],
        tags: newQuestion.tags || []
      };

      // Add image if present
      if (newQuestion.image) {
        newQuestionData.image = newQuestion.image;
      }

      // Add to questions array
      data.questions.push(newQuestionData);
      data.totalQuestions = data.questions.length;
      data.lastUpdated = new Date().toISOString();

      // Save
      await invoke('save_questions', { questionsJson: JSON.stringify(data, null, 2) });

      // Log the change
      addChangeLogEntry('add', newId, newQuestion.question, newQuestion.topic);

      notify.success('Frage wurde erfolgreich hinzugefügt!\n\nBitte lade die App neu (F5), um die Änderungen zu sehen.');
      setShowAddModal(false);
      await loadQuestions();
    } catch (error) {
      console.error('Error adding question:', error);
      notify.error('Fehler beim Hinzufügen der Frage!');
    }
  };


  const handleImportJSON = async () => {
    const isTauri = '__TAURI_INTERNALS__' in window;

    if (!isTauri) {
      notify.warning('Das Importieren von Fragen ist nur in der Desktop-App möglich!\n\nBitte starte die App mit: npm run tauri dev');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedData = JSON.parse(text);

        if (!importedData.questions || !Array.isArray(importedData.questions)) {
          notify.error('Ungültige JSON-Datei! Die Datei muss ein "questions"-Array enthalten.');
          return;
        }

        const { invoke } = await import('@tauri-apps/api/core');
        const questionsJson = await invoke<string>('read_questions');
        const currentData = JSON.parse(questionsJson);

        // Merge questions
        const startNumber = Math.max(...currentData.questions.map((q: any) => q.questionNumber || 0)) + 1;
        const newQuestions = importedData.questions.map((q: any, index: number) => ({
          ...q,
          questionNumber: startNumber + index,
          id: `q${String(startNumber + index).padStart(3, '0')}`
        }));

        currentData.questions.push(...newQuestions);
        currentData.totalQuestions = currentData.questions.length;
        currentData.lastUpdated = new Date().toISOString();

        await invoke('save_questions', { questionsJson: JSON.stringify(currentData, null, 2) });

        notify.success(`${newQuestions.length} Fragen wurden erfolgreich importiert!\n\nBitte lade die App neu (F5).`);
        await loadQuestions();
      } catch (error) {
        console.error('Error importing questions:', error);
        notify.error('Fehler beim Importieren der Fragen!');
      }
    };

    input.click();
  };

  const handleDeleteQuestion = (question: DisplayQuestion) => {
    const isTauri = '__TAURI_INTERNALS__' in window;

    if (!isTauri) {
      notify.warning('Das Löschen von Fragen ist nur in der Desktop-App möglich!\n\nBitte starte die App mit: npm run tauri dev');
      return;
    }

    customConfirm(
      `Möchtest du diese Frage wirklich löschen?\n\n` +
      `ID: ${question.id}\n` +
      `Quelle: ${question.source === 'standard' ? 'Standard' : 'Manual'}\n` +
      `Frage: ${question.question.substring(0, 100)}...\n\n` +
      `Diese Aktion kann nicht rückgängig gemacht werden!`,
      async () => {
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const questionsJson = await invoke<string>('read_questions');
          const data = JSON.parse(questionsJson);

          // Find the question before deleting for log
          const questionToDelete = data.questions.find((q: any) => q.id === question.id);
          const categoryName = questionToDelete?.topic || 'Unknown';

          // Remove question
          data.questions = data.questions.filter((q: any) => q.id !== question.id);
          data.totalQuestions = data.questions.length;
          data.lastUpdated = new Date().toISOString();

          await invoke('save_questions', { questionsJson: JSON.stringify(data, null, 2) });

          // Log the change
          addChangeLogEntry('delete', question.id, question.question, categoryName);

          notify.success('Frage wurde erfolgreich gelöscht!\n\nBitte lade die App neu (F5).');
          await loadQuestions();
        } catch (error) {
          console.error('Error deleting question:', error);
          notify.error('Fehler beim Löschen der Frage!');
        }
      },
      {
        title: 'Frage löschen',
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
        type: 'danger'
      }
    );
  };

  const handleEditQuestion = async (question: DisplayQuestion, index?: number) => {
    try {
      // Load full question data
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

      const fullQuestion = data.questions.find((q: any) => q.id === question.id);
      if (!fullQuestion) {
        notify.error('Frage nicht gefunden!');
        return;
      }

      // Set editing question and index
      setEditingQuestion(fullQuestion as OldQuestion);
      if (index !== undefined) {
        setEditingIndex(index);
      } else {
        const foundIndex = filteredQuestions.findIndex(q => q.id === question.id);
        setEditingIndex(foundIndex);
      }
    } catch (error) {
      console.error('Error loading question for edit:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      notify.error('Fehler beim Laden der Frage!\n\nDetails: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleNavigateQuestion = async (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? editingIndex - 1 : editingIndex + 1;
    if (newIndex >= 0 && newIndex < filteredQuestions.length) {
      await handleEditQuestion(filteredQuestions[newIndex], newIndex);
    }
  };

  const handleEditQuestionById = async (questionId: string) => {
    // Find the question in the current list
    const questionIndex = questions.findIndex(q => q.id === questionId);
    if (questionIndex !== -1) {
      setOpenedFromChangeLog(true);
      setShowChangeLog(false);
      await handleEditQuestion(questions[questionIndex], questionIndex);
    } else {
      notify.error('Frage nicht gefunden!');
    }
  };

  const handleBackToChangeLog = () => {
    setEditingQuestion(null);
    setEditingIndex(-1);
    setOpenedFromChangeLog(false);
    setShowChangeLog(true);
  };

  const handleSaveEdit = async (updatedQuestion: OldQuestion) => {
    const isTauri = '__TAURI_INTERNALS__' in window;

    if (!isTauri) {
      notify.warning('Das Bearbeiten von Fragen ist nur in der Desktop-App möglich!');
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const questionsJson = await invoke<string>('read_questions');
      const data = JSON.parse(questionsJson);

      // Find and update question
      const questionIndex = data.questions.findIndex((q: any) => q.id === updatedQuestion.id);
      if (questionIndex === -1) {
        notify.error('Frage nicht gefunden!');
        return;
      }

      // Get original data
      const originalQuestion = data.questions[questionIndex];
      const originalSource = originalQuestion.source || 'standard';
      const originalTopic = originalQuestion.topic;

      // Category prefixes
      const categoryPrefixes: Record<string, string> = {
        'Network Fundamentals': 'nf',
        'Network Access': 'na',
        'IP Connectivity': 'ic',
        'IP Services': 'is',
        'Security Fundamentals': 'sf',
        'Automation and Programmability': 'ap'
      };

      // Check if topic changed - if so, generate new ID
      let newId = updatedQuestion.id;
      if (originalTopic !== updatedQuestion.topic) {
        const newPrefix = categoryPrefixes[updatedQuestion.topic];
        if (newPrefix) {
          // Find highest ID in new category
          const categoryQuestions = data.questions.filter((q: any) =>
            q.topic === updatedQuestion.topic && q.id !== updatedQuestion.id
          );

          let maxNumber = 0;
          categoryQuestions.forEach((q: any) => {
            const match = q.id.match(/^[a-z]+-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNumber) maxNumber = num;
            }
          });

          newId = `${newPrefix}-${String(maxNumber + 1).padStart(4, '0')}`;
          notify.info(`Kategorie geändert: ID wurde von ${updatedQuestion.id} zu ${newId} aktualisiert`);
        }
      }

      // Convert to questions.json format
      const updatedData: any = {
        id: newId,
        source: originalSource,
        topic: updatedQuestion.topic,
        subtopic: updatedQuestion.subtopic || '',
        difficulty: updatedQuestion.difficulty || 'medium',
        type: updatedQuestion.type,
        question: updatedQuestion.question,
        options: updatedQuestion.options,
        correctAnswer: updatedQuestion.correctAnswer,
        explanation: updatedQuestion.explanation || '',
        references: updatedQuestion.references || [],
        tags: updatedQuestion.tags || []
      };

      if (updatedQuestion.image) {
        updatedData.image = updatedQuestion.image;
      }

      data.questions[questionIndex] = updatedData;
      data.lastUpdated = new Date().toISOString();

      await invoke('save_questions', { questionsJson: JSON.stringify(data, null, 2) });

      // Log the change
      const changes = originalTopic !== updatedQuestion.topic
        ? `Kategorie: ${originalTopic} → ${updatedQuestion.topic}, ID: ${updatedQuestion.id} → ${newId}`
        : 'Frage bearbeitet';
      addChangeLogEntry('edit', newId, updatedQuestion.question, updatedQuestion.topic, changes);

      notify.success('Frage wurde erfolgreich aktualisiert!\n\nBitte lade die App neu (F5).');
      setEditingQuestion(null);
      await loadQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      notify.error('Fehler beim Aktualisieren der Frage!');
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filterCategory !== 'all' && q.category !== filterCategory) return false;
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-lg text-gray-400">Lade Fragen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-black text-white mb-2">Fragendatenbank</h1>
            <p className="text-gray-400">Verwalte alle CCNA-Prüfungsfragen</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowChangeLog(true)}
              className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-xl">📝</span>
              <span>Änderungsprotokoll</span>
            </button>
            <button
              onClick={handleImportJSON}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-xl">📥</span>
              <span>JSON importieren</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <span className="text-xl">➕</span>
              <span>Neue Frage</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="overflow-x-auto mb-6">
          <div className="grid grid-cols-4 gap-6 min-w-max">
            <div className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-600 min-w-[160px]">
              <div className="text-4xl font-black text-blue-400 mb-2">{questions.length}</div>
              <div className="text-gray-300 font-semibold whitespace-nowrap">Gesamt</div>
            </div>
            <div className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-600 min-w-[160px]">
              <div className="text-4xl font-black text-green-400 mb-2">
                {questions.filter(q => q.difficulty === 'easy').length}
              </div>
              <div className="text-gray-300 font-semibold whitespace-nowrap">Easy</div>
            </div>
            <div className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-600 min-w-[160px]">
              <div className="text-4xl font-black text-amber-400 mb-2">
                {questions.filter(q => q.difficulty === 'medium').length}
              </div>
              <div className="text-gray-300 font-semibold whitespace-nowrap">Medium</div>
            </div>
            <div className="bg-gray-700 rounded-xl p-6 shadow-sm border border-gray-600 min-w-[160px]">
              <div className="text-4xl font-black text-red-400 mb-2">
                {questions.filter(q => q.difficulty === 'hard').length}
              </div>
              <div className="text-gray-300 font-semibold whitespace-nowrap">Hard</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-bold text-white mb-2">Kategorie</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-700 text-white border-2 border-gray-600 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Alle Kategorien</option>
              <option value="network-fundamentals">Network Fundamentals</option>
              <option value="network-access">Network Access</option>
              <option value="ip-connectivity">IP Connectivity</option>
              <option value="ip-services">IP Services</option>
              <option value="security-fundamentals">Security Fundamentals</option>
              <option value="automation-programmability">Automation & Programmability</option>
            </select>
          </div>
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-bold text-white mb-2">Schwierigkeit</label>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value as any)}
              className="w-full px-4 py-2 bg-gray-700 text-white border-2 border-gray-600 rounded-xl focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Alle Schwierigkeiten</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Question List */}
      <div className="bg-gray-700 rounded-2xl shadow-sm border border-gray-600">
        {/* Sticky Scroll Controls */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-600 rounded-t-2xl">
          <span className="text-gray-400 text-sm">Tabelle scrollen:</span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const container = document.getElementById('question-table-scroll');
                if (container) container.scrollBy({ left: -400, behavior: 'smooth' });
              }}
              className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors text-sm"
            >
              ← Links
            </button>
            <button
              onClick={() => {
                const container = document.getElementById('question-table-scroll');
                if (container) container.scrollBy({ left: 400, behavior: 'smooth' });
              }}
              className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-semibold transition-colors text-sm"
            >
              Rechts →
            </button>
          </div>
        </div>
        <div
          id="question-table-scroll"
          className="overflow-x-auto"
        >
          <table className="w-full" style={{ minWidth: '1400px' }}>
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-bold whitespace-nowrap">ID</th>
                <th className="px-6 py-4 text-left font-bold whitespace-nowrap">Frage</th>
                <th className="px-6 py-4 text-left font-bold whitespace-nowrap">Kategorie</th>
                <th className="px-6 py-4 text-left font-bold whitespace-nowrap">Schwierigkeit</th>
                <th className="px-6 py-4 text-left font-bold whitespace-nowrap">Typ</th>
                <th className="px-6 py-4 text-left font-bold whitespace-nowrap">Bild</th>
                <th className="px-6 py-4 text-left font-bold whitespace-nowrap">Quelle</th>
                <th className="px-6 py-4 text-left font-bold whitespace-nowrap">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredQuestions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Keine Fragen gefunden
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((question, index) => (
                  <tr key={question.id} className={index % 2 === 0 ? 'bg-gray-600' : 'bg-gray-700'}>
                    <td className="px-6 py-4 font-mono text-sm text-white font-semibold">{question.id}</td>
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <p className="font-semibold text-gray-100 line-clamp-2">
                          {question.question}
                        </p>
                        {question.topicReference && (
                          <p className="text-xs text-white mt-1">{question.topicReference}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-white">
                        {categoryToTopic[question.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold text-white border ${
                        question.difficulty === 'easy' ? 'bg-green-500 border-green-600' :
                        question.difficulty === 'medium' ? 'bg-amber-500 border-amber-600' :
                        question.difficulty === 'hard' ? 'bg-red-500 border-red-600' :
                        'bg-gray-500 border-gray-600'
                      }`}>
                        {question.difficulty?.toUpperCase() || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold text-white border ${
                        question.type === 'multiple-choice-multiple' ? 'bg-purple-500 border-purple-600' :
                        question.type === 'drag-and-drop' ? 'bg-amber-500 border-amber-600' :
                        question.type === 'matching' ? 'bg-pink-500 border-pink-600' :
                        question.type === 'ordering' ? 'bg-teal-500 border-teal-600' :
                        'bg-blue-500 border-blue-600'
                      }`}>
                        {question.type === 'multiple-choice-single' ? 'MC Single' :
                         question.type === 'multiple-choice-multiple' ? 'MC Multiple' :
                         question.type === 'drag-and-drop' ? 'Drag & Drop' :
                         question.type === 'matching' ? 'Matching' :
                         question.type === 'ordering' ? 'Sortierung' :
                         question.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {question.image ? (
                        <span className="text-lg">📷</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold text-white border ${
                        question.source === 'standard' ? 'bg-blue-500 border-blue-600' : 'bg-green-500 border-green-600'
                      }`}>
                        {question.source === 'standard' ? 'Standard' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditQuestion(question, index)}
                          className="px-3 py-1 rounded-lg text-xs font-bold transition-all bg-blue-500 hover:bg-blue-600 text-white"
                          title="Frage bearbeiten"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question)}
                          className="px-3 py-1 rounded-lg text-xs font-bold transition-all bg-red-500 hover:bg-red-600 text-white"
                          title="Frage löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="mt-6 mb-4 text-center text-sm text-gray-400">
        Zeige {filteredQuestions.length} von {questions.length} Fragen
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <AddQuestionModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddQuestion}
        />
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <AddQuestionModal
          onClose={() => {
            setEditingQuestion(null);
            setEditingIndex(-1);
            setOpenedFromChangeLog(false);
          }}
          onSave={handleSaveEdit}
          initialQuestion={editingQuestion}
          onNavigate={openedFromChangeLog ? undefined : handleNavigateQuestion}
          canNavigatePrev={editingIndex > 0}
          canNavigateNext={editingIndex < filteredQuestions.length - 1}
          currentIndex={editingIndex}
          totalCount={filteredQuestions.length}
          onBackToChangeLog={openedFromChangeLog ? handleBackToChangeLog : undefined}
        />
      )}

      {/* Change Log Viewer */}
      {showChangeLog && (
        <ChangeLogViewer
          onClose={() => setShowChangeLog(false)}
          onEditQuestion={handleEditQuestionById}
        />
      )}
    </div>
  );
}
