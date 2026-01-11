import { Question } from '../types/Question';
import questionsData from '../data/questions.json';

// questions.json is already in the correct format (OLD format)
export const allQuestions: Question[] = questionsData.questions
  ? questionsData.questions as Question[]
  : [];

export function getQuestionsByTopic(topic: string): Question[] {
  return allQuestions.filter(q => q.topic === topic);
}

export function getRandomQuestions(count: number): Question[] {
  const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getExamQuestions(): Question[] {
  try {
    console.log('getExamQuestions called');
    console.log('questionsData:', questionsData);

    // questions.json is already in the correct format
    if (questionsData && questionsData.questions) {
      console.log('Loaded questions, count:', questionsData.questions.length);
      return questionsData.questions as Question[];
    }

    console.log('No questions available');
    return [];
  } catch (error) {
    console.error('Error in getExamQuestions:', error);
    throw error;
  }
}
