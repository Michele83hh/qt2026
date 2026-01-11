import { useState, useEffect } from 'react';
import { DragDropData } from '../../types/Question';

interface DragDropQuestionProps {
  data: DragDropData;
  showExplanation: boolean;
  currentAnswer?: { [itemIndex: number]: string };
  onAnswerChange?: (answer: { [itemIndex: number]: string }) => void;
}

export default function DragDropQuestion({ data, showExplanation, currentAnswer, onAnswerChange }: DragDropQuestionProps) {
  const [itemPlacements, setItemPlacements] = useState<{ [itemIndex: number]: string }>(currentAnswer || {});
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Sync with external state when currentAnswer changes (e.g., navigating between questions)
  useEffect(() => {
    setItemPlacements(currentAnswer || {});
  }, [currentAnswer]);

  useEffect(() => {
    if (onAnswerChange) {
      onAnswerChange(itemPlacements);
    }
  }, [itemPlacements]);

  const handleDragStart = (e: React.DragEvent, itemIndex: number) => {
    setDraggedItem(itemIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    if (draggedItem !== null && !showExplanation) {
      setItemPlacements(prev => ({
        ...prev,
        [draggedItem]: categoryId
      }));
      setDraggedItem(null);
    }
  };

  const handleRemoveItem = (itemIndex: number) => {
    if (!showExplanation) {
      setItemPlacements(prev => {
        const newPlacements = { ...prev };
        delete newPlacements[itemIndex];
        return newPlacements;
      });
    }
  };

  const getItemsInCategory = (categoryId: string) => {
    return Object.entries(itemPlacements)
      .filter(([_, catId]) => catId === categoryId)
      .map(([idx]) => parseInt(idx));
  };

  const getUnplacedItems = () => {
    return data.items
      .map((_, idx) => idx)
      .filter(idx => !(idx in itemPlacements));
  };

  const isCorrectPlacement = (itemIndex: number, categoryId: string) => {
    return data.correctMapping[itemIndex] === categoryId;
  };

  return (
    <div className="space-y-6">
      {/* Unplaced Items (Item Bank) */}
      <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-300">
        <h4 className="font-bold text-gray-700 mb-4">Items (ziehe diese in die richtigen Kategorien):</h4>
        <div className="flex flex-wrap gap-3">
          {getUnplacedItems().length === 0 ? (
            <p className="text-gray-500 italic">Alle Items platziert</p>
          ) : (
            getUnplacedItems().map(itemIndex => (
              <div
                key={itemIndex}
                draggable={!showExplanation}
                onDragStart={(e) => handleDragStart(e, itemIndex)}
                className={`px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm ${
                  !showExplanation ? 'cursor-move hover:border-blue-500 hover:shadow-md' : 'cursor-default'
                } transition-all`}
              >
                <span className="text-sm font-semibold text-gray-800">
                  {data.items[itemIndex]}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Drop Zones (Categories) */}
      <div className="grid gap-4">
        {data.categories.map(category => {
          const itemsInCategory = getItemsInCategory(category.id);

          return (
            <div
              key={category.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, category.id)}
              className={`min-h-32 p-6 rounded-xl border-2 transition-all ${
                draggedItem !== null && !showExplanation
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 bg-white'
              }`}
            >
              <h4 className="font-bold text-gray-900 mb-4">{category.label}</h4>

              <div className="space-y-2">
                {itemsInCategory.length === 0 ? (
                  <p className="text-gray-400 italic text-sm">Ziehe Items hierher...</p>
                ) : (
                  itemsInCategory.map(itemIndex => {
                    const isCorrect = isCorrectPlacement(itemIndex, category.id);

                    return (
                      <div
                        key={itemIndex}
                        className={`px-4 py-3 rounded-lg border-2 flex items-center justify-between ${
                          showExplanation
                            ? isCorrect
                              ? 'bg-green-50 border-green-500'
                              : 'bg-red-50 border-red-500'
                            : 'bg-blue-50 border-blue-500'
                        }`}
                      >
                        <span className={`text-sm font-semibold ${
                          showExplanation
                            ? isCorrect
                              ? 'text-green-900'
                              : 'text-red-900'
                            : 'text-blue-900'
                        }`}>
                          {data.items[itemIndex]}
                        </span>

                        <div className="flex items-center gap-2">
                          {showExplanation && (
                            <span className={`text-xl ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                              {isCorrect ? '✓' : '✗'}
                            </span>
                          )}
                          {!showExplanation && (
                            <button
                              onClick={() => handleRemoveItem(itemIndex)}
                              className="text-gray-500 hover:text-red-600 transition-colors"
                              title="Entfernen"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Correct Answer Display (only in explanation mode) */}
      {showExplanation && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h4 className="font-bold text-blue-900 mb-4">Korrekte Zuordnung:</h4>
          <div className="grid gap-3">
            {data.categories.map(category => (
              <div key={category.id}>
                <h5 className="font-bold text-blue-800 text-sm mb-2">{category.label}:</h5>
                <ul className="list-disc list-inside text-sm text-blue-900 space-y-1">
                  {Object.entries(data.correctMapping)
                    .filter(([_, catId]) => catId === category.id)
                    .map(([itemIdx]) => (
                      <li key={itemIdx}>{data.items[parseInt(itemIdx)]}</li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
