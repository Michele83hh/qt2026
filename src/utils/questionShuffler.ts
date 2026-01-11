import { Question } from '../types/Question';

/**
 * Fisher-Yates shuffle algorithm - generic array shuffler
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles the options of a question and updates the correctAnswer indices accordingly.
 * This ensures that the correct answer remains correct after shuffling.
 *
 * @param question - The original question
 * @returns A new question object with shuffled options and updated correctAnswer indices
 */
export function shuffleQuestionOptions(question: Question): Question {
  // Multiple-choice shuffling
  if (question.type === 'multiple-choice-single' || question.type === 'multiple-choice-multiple') {
    // Create index mapping array [0, 1, 2, 3, ...]
    const indices = question.options.map((_, i) => i);

    // Fisher-Yates shuffle algorithm
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Create shuffled options based on new indices
    const shuffledOptions = indices.map(i => question.options[i]);

    // Map old correct answer indices to new positions
    const shuffledCorrectAnswer = question.correctAnswer.map(oldIndex => {
      return indices.indexOf(oldIndex);
    });

    return {
      ...question,
      options: shuffledOptions,
      correctAnswer: shuffledCorrectAnswer
    };
  }

  // Drag & Drop shuffling
  if (question.type === 'drag-and-drop' && question.dragDropData) {
    const shuffledItems = shuffleArray(question.dragDropData.items);
    const shuffledCategories = shuffleArray(question.dragDropData.categories);

    // Update mapping to reflect new positions
    const newMapping: { [itemIndex: number]: string } = {};
    shuffledItems.forEach((item, newIndex) => {
      const oldIndex = question.dragDropData!.items.indexOf(item);
      const categoryId = question.dragDropData!.correctMapping[oldIndex];
      newMapping[newIndex] = categoryId;
    });

    return {
      ...question,
      dragDropData: {
        items: shuffledItems,
        categories: shuffledCategories,
        correctMapping: newMapping
      }
    };
  }

  // Matching shuffling (shuffle both columns)
  if (question.type === 'matching' && question.matchingData) {
    const shuffledLeft = shuffleArray(question.matchingData.leftColumn);
    const shuffledRight = shuffleArray(question.matchingData.rightColumn);

    // Mapping stays the same (uses IDs, not positions)
    return {
      ...question,
      matchingData: {
        leftColumn: shuffledLeft,
        rightColumn: shuffledRight,
        correctMatches: question.matchingData.correctMatches
      }
    };
  }

  // Ordering shuffling
  if (question.type === 'ordering' && question.orderingData) {
    const shuffledItems = shuffleArray(question.orderingData.items);

    // correctOrder stays the same (uses IDs, not positions)
    return {
      ...question,
      orderingData: {
        items: shuffledItems,
        correctOrder: question.orderingData.correctOrder
      }
    };
  }

  // For any other type, return unchanged
  return question;
}

/**
 * Shuffles options for an array of questions.
 * Each question gets its own unique shuffle.
 *
 * @param questions - Array of questions to shuffle
 * @returns Array of questions with shuffled options
 */
export function shuffleQuestionsOptions(questions: Question[]): Question[] {
  return questions.map(q => shuffleQuestionOptions(q));
}
