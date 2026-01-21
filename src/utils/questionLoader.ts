import { Question } from '../types/Question';
import { shuffleArray } from './questionShuffler';
import questionsData from '../data/questions.json';

// questions.json is already in the correct format (OLD format)
export const allQuestions: Question[] = questionsData.questions
  ? questionsData.questions as Question[]
  : [];

export function getQuestionsByTopic(topic: string): Question[] {
  return allQuestions.filter(q => q.topic === topic);
}

export function getRandomQuestions(count: number): Question[] {
  // Use proper Fisher-Yates shuffle with crypto randomness
  const shuffled = shuffleArray(allQuestions);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getExamQuestions(): Question[] {
  try {
    if (questionsData && questionsData.questions) {
      return questionsData.questions as Question[];
    }
    return [];
  } catch (error) {
    console.error('Error in getExamQuestions:', error);
    throw error;
  }
}
