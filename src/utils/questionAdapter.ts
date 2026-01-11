import { Question as OldQuestion } from '../types/Question';
import { Question as NewQuestion, CCNACategory } from '../types/questions';

// Map new categories to old topics
const categoryToTopic: Record<CCNACategory, OldQuestion['topic']> = {
  'network-fundamentals': 'Network Fundamentals',
  'network-access': 'Network Access',
  'ip-connectivity': 'IP Connectivity',
  'ip-services': 'IP Services',
  'security-fundamentals': 'Security Fundamentals',
  'automation-programmability': 'Automation and Programmability'
};

/**
 * Convert new question format to old format for backwards compatibility
 */
export function convertNewToOld(newQuestion: NewQuestion): OldQuestion {
  try {
    // Check if it's a drag-and-drop or matching question
    const questionType = (newQuestion as any).type;

    let type: OldQuestion['type'];
    if (questionType === 'drag-and-drop' || questionType === 'matching') {
      type = questionType as 'drag-and-drop' | 'matching';
    } else {
      type = newQuestion.multipleAnswers ? 'multiple-choice-multiple' : 'multiple-choice-single';
    }

    // Validate required fields
    if (!newQuestion.id) {
      console.error('Question missing ID:', newQuestion);
      throw new Error('Question is missing required field: id');
    }
    if (!newQuestion.questionText) {
      console.error('Question missing questionText:', newQuestion);
      throw new Error('Question is missing required field: questionText');
    }
    if (!newQuestion.category) {
      console.error('Question missing category:', newQuestion);
      throw new Error('Question is missing required field: category');
    }

    const converted: OldQuestion = {
      id: newQuestion.id,
      topic: categoryToTopic[newQuestion.category] || 'Network Fundamentals',
      subtopic: newQuestion.topicReference || '',
      difficulty: newQuestion.difficulty || 'medium',
      type,
      question: newQuestion.questionText,
      options: newQuestion.options || [],
      correctAnswer: newQuestion.correctAnswerIndexes || [],
      explanation: newQuestion.explanation || 'No explanation provided.',
      references: newQuestion.topicReference ? [newQuestion.topicReference] : [],
      tags: [],
      image: (newQuestion as any).image
    };

    // Preserve dragDropData if present
    if ((newQuestion as any).dragDropData) {
      converted.dragDropData = (newQuestion as any).dragDropData;
    }

    // Preserve matchingData if present
    if ((newQuestion as any).matchingData) {
      converted.matchingData = (newQuestion as any).matchingData;
    }

    return converted;
  } catch (error) {
    console.error('Error converting question:', error);
    console.error('Question data:', newQuestion);
    throw error;
  }
}

/**
 * Load questions from new format JSON file
 */
export async function loadNewFormatQuestions(filePath: string): Promise<OldQuestion[]> {
  try {
    const response = await fetch(filePath);
    const data = await response.json();

    if (data.questions && Array.isArray(data.questions)) {
      return data.questions.map((q: NewQuestion) => convertNewToOld(q));
    }

    return [];
  } catch (error) {
    console.error('Error loading questions:', error);
    return [];
  }
}
