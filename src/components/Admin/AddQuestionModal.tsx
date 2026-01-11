import { useState, useEffect } from 'react';
import { Question, QuestionType, Topic, DragDropData, MatchingData, OrderingData } from '../../types/Question';
import { notify, confirm as customConfirm } from '../../store/notificationStore';
import RichTextEditor from '../UI/RichTextEditor';

interface AddQuestionModalProps {
  onClose: () => void;
  onSave: (newQuestion: Question) => void;
  initialQuestion?: Question;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

export default function AddQuestionModal({
  onClose,
  onSave,
  initialQuestion,
  onNavigate,
  canNavigatePrev = false,
  canNavigateNext = false,
  currentIndex,
  totalCount
}: AddQuestionModalProps) {
  // Common fields
  const [questionText, setQuestionText] = useState(initialQuestion?.question || '');
  const [explanation, setExplanation] = useState(initialQuestion?.explanation || '');
  const [topic, setTopic] = useState<Topic>(initialQuestion?.topic || 'Network Fundamentals');
  const [subtopic, setSubtopic] = useState(initialQuestion?.subtopic || '');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(initialQuestion?.difficulty || 'medium');
  const [imageData, setImageData] = useState<string>(initialQuestion?.image?.data || '');
  const [imageType, setImageType] = useState<'base64' | 'url'>(initialQuestion?.image?.type || 'base64');
  const [imageAlt, setImageAlt] = useState(initialQuestion?.image?.alt || '');

  // Question type
  const getInitialQuestionType = (): QuestionType => {
    if (initialQuestion) return initialQuestion.type;
    return 'multiple-choice-single';
  };
  const [questionType, setQuestionType] = useState<QuestionType>(getInitialQuestionType());

  // Multiple Choice specific
  const [options, setOptions] = useState(initialQuestion?.options || ['', '', '', '']);
  const [correctAnswers, setCorrectAnswers] = useState<number[]>(initialQuestion?.correctAnswer || []);

  // Drag & Drop specific
  const [dragDropItems, setDragDropItems] = useState<string[]>(
    initialQuestion?.dragDropData?.items || ['', '', '']
  );
  const [dragDropCategories, setDragDropCategories] = useState<{ id: string; label: string }[]>(
    initialQuestion?.dragDropData?.categories || [{ id: 'cat1', label: '' }, { id: 'cat2', label: '' }]
  );
  const [dragDropMapping, setDragDropMapping] = useState<{ [itemIndex: number]: string }>(
    initialQuestion?.dragDropData?.correctMapping || {}
  );

  // Matching specific
  const [matchingLeft, setMatchingLeft] = useState<{ id: string; label: string }[]>(
    initialQuestion?.matchingData?.leftColumn || [
      { id: 'left1', label: '' },
      { id: 'left2', label: '' },
      { id: 'left3', label: '' }
    ]
  );
  const [matchingRight, setMatchingRight] = useState<{ id: string; label: string }[]>(
    initialQuestion?.matchingData?.rightColumn || [
      { id: 'right1', label: '' },
      { id: 'right2', label: '' },
      { id: 'right3', label: '' }
    ]
  );
  const [matchingPairs, setMatchingPairs] = useState<{ [leftId: string]: string }>(
    initialQuestion?.matchingData?.correctMatches || {}
  );

  // Ordering specific
  const [orderingItems, setOrderingItems] = useState<{ id: string; label: string }[]>(
    initialQuestion?.orderingData?.items || [
      { id: 'item1', label: '' },
      { id: 'item2', label: '' },
      { id: 'item3', label: '' }
    ]
  );
  const [orderingSequence, setOrderingSequence] = useState<string[]>(
    initialQuestion?.orderingData?.correctOrder || []
  );

  // Track changes for dirty check
  const [initialData, setInitialData] = useState({
    questionText: initialQuestion?.question || '',
    explanation: initialQuestion?.explanation || '',
    topic: initialQuestion?.topic || 'Network Fundamentals',
    subtopic: initialQuestion?.subtopic || '',
    difficulty: initialQuestion?.difficulty || 'medium'
  });

  // Update state when initialQuestion changes (for navigation)
  useEffect(() => {
    if (initialQuestion) {
      setQuestionText(initialQuestion.question || '');
      setExplanation(initialQuestion.explanation || '');
      setTopic(initialQuestion.topic || 'Network Fundamentals');
      setSubtopic(initialQuestion.subtopic || '');
      setDifficulty(initialQuestion.difficulty || 'medium');
      setImageData(initialQuestion.image?.data || '');
      setImageType(initialQuestion.image?.type || 'base64');
      setImageAlt(initialQuestion.image?.alt || '');
      setQuestionType(initialQuestion.type);
      setOptions(initialQuestion.options || ['', '', '', '']);
      setCorrectAnswers(initialQuestion.correctAnswer || []);

      // Update drag-drop data
      setDragDropItems(initialQuestion.dragDropData?.items || ['', '', '']);
      setDragDropCategories(initialQuestion.dragDropData?.categories || [{ id: 'cat1', label: '' }, { id: 'cat2', label: '' }]);
      setDragDropMapping(initialQuestion.dragDropData?.correctMapping || {});

      // Update matching data
      setMatchingLeft(initialQuestion.matchingData?.leftColumn || [
        { id: 'left1', label: '' },
        { id: 'left2', label: '' },
        { id: 'left3', label: '' }
      ]);
      setMatchingRight(initialQuestion.matchingData?.rightColumn || [
        { id: 'right1', label: '' },
        { id: 'right2', label: '' },
        { id: 'right3', label: '' }
      ]);
      setMatchingPairs(initialQuestion.matchingData?.correctMatches || {});

      // Update ordering data
      setOrderingItems(initialQuestion.orderingData?.items || [
        { id: 'item1', label: '' },
        { id: 'item2', label: '' },
        { id: 'item3', label: '' }
      ]);
      setOrderingSequence(initialQuestion.orderingData?.correctOrder || []);

      // Update initial data for dirty check
      setInitialData({
        questionText: initialQuestion.question || '',
        explanation: initialQuestion.explanation || '',
        topic: initialQuestion.topic || 'Network Fundamentals',
        subtopic: initialQuestion.subtopic || '',
        difficulty: initialQuestion.difficulty || 'medium'
      });
    }
  }, [initialQuestion?.id]);

  // Navigation handler with dirty check
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!onNavigate) return;

    // Check if there are unsaved changes
    const hasChanges = questionText !== initialData.questionText ||
                       explanation !== initialData.explanation ||
                       topic !== initialData.topic ||
                       subtopic !== initialData.subtopic ||
                       difficulty !== initialData.difficulty;

    if (hasChanges) {
      customConfirm(
        'Du hast ungespeicherte Änderungen!\n\nMöchtest du zur nächsten Frage navigieren?\nAlle Änderungen gehen verloren.',
        () => {
          onNavigate(direction);
        },
        {
          title: 'Ungespeicherte Änderungen',
          confirmText: 'Verwerfen',
          cancelText: 'Abbrechen',
          type: 'warning'
        }
      );
    } else {
      onNavigate(direction);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      notify.error('Bild ist zu groß! Maximal 5 MB erlaubt.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImageData(base64);
      setImageType('base64');
      if (!imageAlt) {
        setImageAlt(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageData('');
    setImageAlt('');
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const toggleCorrectAnswer = (index: number) => {
    if (questionType === 'multiple-choice-multiple') {
      if (correctAnswers.includes(index)) {
        setCorrectAnswers(correctAnswers.filter(i => i !== index));
      } else {
        setCorrectAnswers([...correctAnswers, index]);
      }
    } else {
      setCorrectAnswers([index]);
    }
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 3) {
      notify.error('Mindestens 3 Antwortoptionen erforderlich!');
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    setCorrectAnswers(correctAnswers.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const handleSave = () => {
    // Validation
    if (!questionText.trim()) {
      notify.error('Bitte gib einen Fragetext ein!');
      return;
    }

    if (!explanation.trim()) {
      notify.error('Bitte gib eine Erklärung ein!');
      return;
    }

    // Type-specific validation
    let newQuestion: Question;

    try {
      if (questionType === 'multiple-choice-single' || questionType === 'multiple-choice-multiple') {
        // Validate options
        const filledOptions = options.filter(opt => opt.trim());
        if (filledOptions.length < 3) {
          notify.error('Mindestens 3 Antwortoptionen erforderlich!');
          return;
        }
        if (correctAnswers.length === 0) {
          notify.error('Bitte markiere mindestens eine richtige Antwort!');
          return;
        }

        newQuestion = {
          id: initialQuestion?.id || `q${Date.now()}`,
          topic,
          subtopic,
          difficulty,
          type: questionType,
          question: questionText,
          options: filledOptions,
          correctAnswer: correctAnswers,
          explanation,
          references: subtopic ? [subtopic] : [],
          tags: [],
          image: imageData ? { type: imageType, data: imageData, alt: imageAlt } : undefined
        };
      } else if (questionType === 'drag-and-drop') {
        // Validate drag-drop
        const filledItems = dragDropItems.filter(item => item.trim());
        const filledCategories = dragDropCategories.filter(cat => cat.label.trim());

        if (filledItems.length < 2) {
          notify.error('Mindestens 2 Items für Drag & Drop erforderlich!');
          return;
        }
        if (filledCategories.length < 2) {
          notify.error('Mindestens 2 Kategorien erforderlich!');
          return;
        }
        if (Object.keys(dragDropMapping).length !== filledItems.length) {
          notify.error('Bitte ordne alle Items einer Kategorie zu!');
          return;
        }

        const dragDropData: DragDropData = {
          items: filledItems,
          categories: filledCategories,
          correctMapping: dragDropMapping
        };

        newQuestion = {
          id: initialQuestion?.id || `q${Date.now()}`,
          topic,
          subtopic,
          difficulty,
          type: questionType,
          question: questionText,
          options: [],
          correctAnswer: [],
          explanation,
          references: subtopic ? [subtopic] : [],
          tags: [],
          dragDropData,
          image: imageData ? { type: imageType, data: imageData, alt: imageAlt } : undefined
        };
      } else if (questionType === 'matching') {
        // Validate matching
        const filledLeft = matchingLeft.filter(item => item.label.trim());
        const filledRight = matchingRight.filter(item => item.label.trim());

        if (filledLeft.length < 2 || filledRight.length < 2) {
          notify.error('Mindestens 2 Paare für Matching erforderlich!');
          return;
        }
        if (Object.keys(matchingPairs).length !== filledLeft.length) {
          notify.error('Bitte ordne alle linken Items einem rechten Item zu!');
          return;
        }

        const matchingData: MatchingData = {
          leftColumn: filledLeft,
          rightColumn: filledRight,
          correctMatches: matchingPairs
        };

        newQuestion = {
          id: initialQuestion?.id || `q${Date.now()}`,
          topic,
          subtopic,
          difficulty,
          type: questionType,
          question: questionText,
          options: [],
          correctAnswer: [],
          explanation,
          references: subtopic ? [subtopic] : [],
          tags: [],
          matchingData,
          image: imageData ? { type: imageType, data: imageData, alt: imageAlt } : undefined
        };
      } else if (questionType === 'ordering') {
        // Validate ordering
        const filledItems = orderingItems.filter(item => item.label.trim());

        if (filledItems.length < 2) {
          notify.error('Mindestens 2 Items für Sortierung erforderlich!');
          return;
        }
        if (orderingSequence.length !== filledItems.length) {
          notify.error('Bitte definiere die korrekte Reihenfolge!');
          return;
        }

        const orderingData: OrderingData = {
          items: filledItems,
          correctOrder: orderingSequence
        };

        newQuestion = {
          id: initialQuestion?.id || `q${Date.now()}`,
          topic,
          subtopic,
          difficulty,
          type: questionType,
          question: questionText,
          options: [],
          correctAnswer: [],
          explanation,
          references: subtopic ? [subtopic] : [],
          tags: [],
          orderingData,
          image: imageData ? { type: imageType, data: imageData, alt: imageAlt } : undefined
        };
      } else {
        notify.error('Unbekannter Fragetyp!');
        return;
      }

      onSave(newQuestion);
    } catch (error) {
      console.error('Error creating question:', error);
      notify.error('Fehler beim Erstellen der Frage!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">
                {initialQuestion ? 'Frage bearbeiten' : 'Neue Frage hinzufügen'}
              </h2>
              <p className="text-green-100 text-sm mt-1">
                {initialQuestion ? 'Bearbeite die CCNA-Prüfungsfrage' : 'Erstelle eine neue CCNA-Prüfungsfrage'}
                {initialQuestion && currentIndex !== undefined && totalCount !== undefined && (
                  <span className="ml-2 font-bold">
                    ({currentIndex + 1} / {totalCount})
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Navigation buttons when editing */}
              {initialQuestion && onNavigate && (
                <div className="flex gap-2 mr-4">
                  <button
                    onClick={() => handleNavigate('prev')}
                    disabled={!canNavigatePrev}
                    className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                      canNavigatePrev
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                    title="Vorherige Frage"
                  >
                    ← Zurück
                  </button>
                  <button
                    onClick={() => handleNavigate('next')}
                    disabled={!canNavigateNext}
                    className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                      canNavigateNext
                        ? 'bg-white/20 hover:bg-white/30 text-white'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                    title="Nächste Frage"
                  >
                    Weiter →
                  </button>
                </div>
              )}
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
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Question Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Fragetyp *
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as QuestionType)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none"
            >
              <option value="multiple-choice-single">Multiple Choice (Einzelauswahl)</option>
              <option value="multiple-choice-multiple">Multiple Choice (Mehrfachauswahl)</option>
              <option value="drag-and-drop">Drag & Drop (Zuordnung)</option>
              <option value="matching">Matching (Paare zuordnen)</option>
              <option value="ordering">Sortierung (Reihenfolge)</option>
            </select>
            {initialQuestion && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠️ Achtung: Beim Ändern des Fragetyps müssen ggf. auch die Antwortoptionen angepasst werden!
              </p>
            )}
          </div>

          {/* Question Text */}
          <RichTextEditor
            label="Fragetext"
            required={true}
            value={questionText}
            onChange={setQuestionText}
            minHeight="100px"
            placeholder="z.B. Ordne die OSI-Schichten in der richtigen Reihenfolge..."
          />

          {/* Image Upload */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Bild/Diagramm (optional)
            </label>
            {!imageData ? (
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-500 transition-all"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-green-500', 'bg-green-50');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-green-500', 'bg-green-50');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-green-500', 'bg-green-50');
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) {
                    const fakeEvent = { target: { files: [file] } } as any;
                    handleImageUpload(fakeEvent);
                  } else {
                    notify.error('Bitte nur Bilddateien (PNG, JPG, GIF) hochladen!');
                  }
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="imageUpload"
                />
                <label htmlFor="imageUpload" className="cursor-pointer">
                  <div className="text-4xl mb-2">📷</div>
                  <div className="text-sm text-gray-600">Klicke oder ziehe ein Bild hierher</div>
                  <div className="text-xs text-gray-500 mt-1">PNG, JPG, GIF • Max 5 MB</div>
                </label>
              </div>
            ) : (
              <div className="border-2 border-green-500 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={imageData}
                    alt={imageAlt}
                    className="max-w-xs max-h-48 rounded-lg object-contain"
                  />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={imageAlt}
                      onChange={(e) => setImageAlt(e.target.value)}
                      placeholder="Bildbeschreibung"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none mb-2"
                    />
                    <button
                      onClick={removeImage}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all"
                    >
                      🗑️ Bild entfernen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Type-specific content - TO BE CONTINUED */}
          {(questionType === 'multiple-choice-single' || questionType === 'multiple-choice-multiple') && (
            <div className="mb-6 space-y-6">
              <div className="bg-gray-100 rounded-xl p-4 border border-gray-300">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Antwortoptionen * (3-5 Optionen, leere werden verworfen)
                </label>
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <button
                        onClick={() => toggleCorrectAnswer(index)}
                        className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                          correctAnswers.includes(index)
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'bg-white border-gray-300 text-gray-400 hover:border-green-500'
                        }`}
                      >
                        {correctAnswers.includes(index) ? '✓' : String.fromCharCode(65 + index)}
                      </button>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none"
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                      {options.length > 3 && (
                        <button
                          onClick={() => removeOption(index)}
                          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {options.length < 5 && (
                  <button
                    onClick={addOption}
                    className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all"
                  >
                    + Option hinzufügen
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Drag & Drop Editor */}
          {questionType === 'drag-and-drop' && (
            <div className="mb-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-300">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Items zum Zuordnen *
                </label>
                <div className="space-y-2">
                  {dragDropItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-8 text-center font-bold text-gray-600">{index + 1}.</span>
                      <input
                        type="text"
                        value={item}
                        onChange={(e) => {
                          const newItems = [...dragDropItems];
                          newItems[index] = e.target.value;
                          setDragDropItems(newItems);
                        }}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                        placeholder={`Item ${index + 1}`}
                      />
                      {dragDropItems.length > 2 && (
                        <button
                          onClick={() => {
                            const newItems = dragDropItems.filter((_, i) => i !== index);
                            setDragDropItems(newItems);
                            const newMapping = { ...dragDropMapping };
                            delete newMapping[index];
                            Object.keys(newMapping).forEach(key => {
                              const numKey = parseInt(key);
                              if (numKey > index) {
                                newMapping[numKey - 1] = newMapping[numKey];
                                delete newMapping[numKey];
                              }
                            });
                            setDragDropMapping(newMapping);
                          }}
                          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setDragDropItems([...dragDropItems, ''])}
                  className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all"
                >
                  + Item hinzufügen
                </button>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border border-purple-300">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Kategorien *
                </label>
                <div className="space-y-2">
                  {dragDropCategories.map((category, index) => (
                    <div key={category.id} className="flex items-center gap-2">
                      <span className="w-8 text-center font-bold text-purple-600">{String.fromCharCode(65 + index)}</span>
                      <input
                        type="text"
                        value={category.label}
                        onChange={(e) => {
                          const newCats = [...dragDropCategories];
                          newCats[index].label = e.target.value;
                          setDragDropCategories(newCats);
                        }}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                        placeholder={`Kategorie ${String.fromCharCode(65 + index)}`}
                      />
                      {dragDropCategories.length > 2 && (
                        <button
                          onClick={() => {
                            const newCats = dragDropCategories.filter((_, i) => i !== index);
                            setDragDropCategories(newCats);
                          }}
                          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setDragDropCategories([...dragDropCategories, { id: `cat${Date.now()}`, label: '' }])}
                  className="mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-all"
                >
                  + Kategorie hinzufügen
                </button>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-300">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Zuordnung (Welches Item gehört zu welcher Kategorie?) *
                </label>
                <div className="space-y-2">
                  {dragDropItems.map((item, index) => (
                    item.trim() && (
                      <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                        <span className="font-semibold text-gray-700 flex-1">
                          {index + 1}. {item || `(Item ${index + 1})`}
                        </span>
                        <span className="text-gray-500">→</span>
                        <select
                          value={dragDropMapping[index] || ''}
                          onChange={(e) => {
                            const newMapping = { ...dragDropMapping };
                            newMapping[index] = e.target.value;
                            setDragDropMapping(newMapping);
                          }}
                          className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                        >
                          <option value="">Kategorie wählen...</option>
                          {dragDropCategories.map((cat, catIndex) => (
                            cat.label.trim() && (
                              <option key={cat.id} value={cat.id}>
                                {String.fromCharCode(65 + catIndex)}. {cat.label}
                              </option>
                            )
                          ))}
                        </select>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Matching Editor */}
          {questionType === 'matching' && (
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-300">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Linke Spalte *
                  </label>
                  <div className="space-y-2">
                    {matchingLeft.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => {
                            const newLeft = [...matchingLeft];
                            newLeft[index].label = e.target.value;
                            setMatchingLeft(newLeft);
                          }}
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                          placeholder={`Begriff ${index + 1}`}
                        />
                        {matchingLeft.length > 2 && (
                          <button
                            onClick={() => {
                              const itemId = matchingLeft[index].id;
                              const newLeft = matchingLeft.filter((_, i) => i !== index);
                              setMatchingLeft(newLeft);
                              const newPairs = { ...matchingPairs };
                              delete newPairs[itemId];
                              setMatchingPairs(newPairs);
                            }}
                            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setMatchingLeft([...matchingLeft, { id: `left${Date.now()}`, label: '' }])}
                    className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all"
                  >
                    + Hinzufügen
                  </button>
                </div>

                <div className="bg-purple-50 rounded-xl p-4 border border-purple-300">
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Rechte Spalte *
                  </label>
                  <div className="space-y-2">
                    {matchingRight.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => {
                            const newRight = [...matchingRight];
                            newRight[index].label = e.target.value;
                            setMatchingRight(newRight);
                          }}
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none"
                          placeholder={`Definition ${index + 1}`}
                        />
                        {matchingRight.length > 2 && (
                          <button
                            onClick={() => {
                              const newRight = matchingRight.filter((_, i) => i !== index);
                              setMatchingRight(newRight);
                            }}
                            className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setMatchingRight([...matchingRight, { id: `right${Date.now()}`, label: '' }])}
                    className="mt-3 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-all"
                  >
                    + Hinzufügen
                  </button>
                </div>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-300">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Zuordnung (Was passt zusammen?) *
                </label>
                <div className="space-y-2">
                  {matchingLeft.map((leftItem) => (
                    leftItem.label.trim() && (
                      <div key={leftItem.id} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                        <span className="font-semibold text-gray-700 flex-1">
                          {leftItem.label}
                        </span>
                        <span className="text-gray-500">↔</span>
                        <select
                          value={matchingPairs[leftItem.id] || ''}
                          onChange={(e) => {
                            const newPairs = { ...matchingPairs };
                            newPairs[leftItem.id] = e.target.value;
                            setMatchingPairs(newPairs);
                          }}
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                        >
                          <option value="">Passendes Item wählen...</option>
                          {matchingRight.map((rightItem) => (
                            rightItem.label.trim() && (
                              <option key={rightItem.id} value={rightItem.id}>
                                {rightItem.label}
                              </option>
                            )
                          ))}
                        </select>
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ordering Editor */}
          {questionType === 'ordering' && (
            <div className="mb-6 space-y-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-300">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Items zum Sortieren *
                </label>
                <div className="space-y-2">
                  {orderingItems.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => {
                          const newItems = [...orderingItems];
                          newItems[index].label = e.target.value;
                          setOrderingItems(newItems);
                        }}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                        placeholder={`Item ${index + 1}`}
                      />
                      {orderingItems.length > 2 && (
                        <button
                          onClick={() => {
                            const itemId = orderingItems[index].id;
                            const newItems = orderingItems.filter((_, i) => i !== index);
                            setOrderingItems(newItems);
                            setOrderingSequence(orderingSequence.filter(id => id !== itemId));
                          }}
                          className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setOrderingItems([...orderingItems, { id: `item${Date.now()}`, label: '' }])}
                  className="mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all"
                >
                  + Item hinzufügen
                </button>
              </div>

              <div className="bg-green-50 rounded-xl p-4 border border-green-300">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Korrekte Reihenfolge definieren *
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Klicke die Items in der richtigen Reihenfolge an (1 = Erstes, 2 = Zweites, etc.)
                </p>
                <div className="space-y-2">
                  {orderingItems.map((item) => (
                    item.label.trim() && (
                      <button
                        key={item.id}
                        onClick={() => {
                          const newSequence = [...orderingSequence];
                          const existingIndex = newSequence.indexOf(item.id);

                          if (existingIndex > -1) {
                            // Already in sequence, remove it
                            newSequence.splice(existingIndex, 1);
                          } else {
                            // Add to sequence
                            newSequence.push(item.id);
                          }
                          setOrderingSequence(newSequence);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                          orderingSequence.includes(item.id)
                            ? 'bg-green-500 text-white'
                            : 'bg-white border-2 border-gray-300 hover:border-green-500'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          orderingSequence.includes(item.id)
                            ? 'bg-white text-green-500'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {orderingSequence.includes(item.id)
                            ? orderingSequence.indexOf(item.id) + 1
                            : '?'}
                        </span>
                        <span className="flex-1 text-left">{item.label}</span>
                      </button>
                    )
                  ))}
                </div>
                {orderingSequence.length > 0 && (
                  <button
                    onClick={() => setOrderingSequence([])}
                    className="mt-3 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all"
                  >
                    Reihenfolge zurücksetzen
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Explanation */}
          <RichTextEditor
            label="Erklärung"
            required={true}
            value={explanation}
            onChange={setExplanation}
            minHeight="140px"
            placeholder="Erkläre warum die Antwort richtig ist..."
          />

          {/* Topic, Subtopic, Difficulty */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Topic *
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value as Topic)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none"
              >
                <option>Network Fundamentals</option>
                <option>Network Access</option>
                <option>IP Connectivity</option>
                <option>IP Services</option>
                <option>Security Fundamentals</option>
                <option>Automation and Programmability</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Subtopic (optional)
              </label>
              <input
                type="text"
                value={subtopic}
                onChange={(e) => setSubtopic(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none"
                placeholder="Topic 1.8.0"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Schwierigkeit *
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 p-6 rounded-b-2xl flex gap-3 justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition-all"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg"
          >
            {initialQuestion ? 'Änderungen speichern' : 'Frage hinzufügen'}
          </button>
        </div>
      </div>
    </div>
  );
}
