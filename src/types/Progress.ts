import { Topic } from './Question';

// User answers for review (supports all question types)
export interface StoredUserAnswers {
  // For multiple-choice questions: questionId -> selected indices
  multipleChoice: Record<string, number[]>;
  // For drag-and-drop questions: questionId -> { itemIndex: categoryId }
  dragDrop: Record<string, Record<number, string>>;
  // For matching questions: questionId -> { leftId: rightId }
  matching: Record<string, Record<string, string>>;
}

// Stored question for review (with shuffled options)
export interface StoredQuestion {
  id: string;
  topic: Topic;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: string;
  question: string;
  options: string[]; // Already shuffled
  correctAnswer: number[]; // Already mapped to shuffled positions
  explanation: string;
}

// Extended Exam History Entry with topic breakdown
export interface ExtendedExamHistoryEntry {
  date: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  passed: boolean;
  // Topic-specific stats for this exam
  topicStats: Record<Topic, { total: number; correct: number }>;
  // IDs of incorrectly answered questions
  incorrectQuestionIds: string[];
  // Streak data for this exam session
  longestStreakInExam: number;
  // For exam review: store question IDs and user answers
  questionIds?: string[];
  userAnswers?: StoredUserAnswers;
  // NEW: Store complete shuffled questions for accurate review
  shuffledQuestions?: StoredQuestion[];
}

// Extended Exam History with aggregated stats
export interface ExtendedExamHistory {
  entries: ExtendedExamHistoryEntry[];
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  overallPercentage: number;
  // Aggregated topic stats across all exams
  topicStats: Record<Topic, { totalAnswered: number; totalCorrect: number }>;
  // Track incorrect questions: questionId -> count of times answered incorrectly
  incorrectQuestions: Record<string, number>;
  // Streak tracking
  bestStreak: number;
  currentStreak: number;
  lastAnswerCorrect: boolean;
}

// For backwards compatibility with old ExamHistory format
export interface LegacyExamHistoryEntry {
  date: string;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  passed: boolean;
}

export interface LegacyExamHistory {
  entries: LegacyExamHistoryEntry[];
  totalQuestionsAnswered: number;
  totalCorrectAnswers: number;
  overallPercentage: number;
}

// Topic display info
export const TOPIC_INFO: Record<Topic, { label: string; weight: string; color: string }> = {
  'Network Fundamentals': { label: 'Network Fundamentals', weight: '20%', color: 'blue' },
  'Network Access': { label: 'Network Access', weight: '20%', color: 'purple' },
  'IP Connectivity': { label: 'IP Connectivity', weight: '25%', color: 'emerald' },
  'IP Services': { label: 'IP Services', weight: '10%', color: 'orange' },
  'Security Fundamentals': { label: 'Security Fundamentals', weight: '15%', color: 'red' },
  'Automation and Programmability': { label: 'Automation & Programmability', weight: '10%', color: 'indigo' }
};

// Initialize empty extended history
export function createEmptyExtendedHistory(): ExtendedExamHistory {
  return {
    entries: [],
    totalQuestionsAnswered: 0,
    totalCorrectAnswers: 0,
    overallPercentage: 0,
    topicStats: {
      'Network Fundamentals': { totalAnswered: 0, totalCorrect: 0 },
      'Network Access': { totalAnswered: 0, totalCorrect: 0 },
      'IP Connectivity': { totalAnswered: 0, totalCorrect: 0 },
      'IP Services': { totalAnswered: 0, totalCorrect: 0 },
      'Security Fundamentals': { totalAnswered: 0, totalCorrect: 0 },
      'Automation and Programmability': { totalAnswered: 0, totalCorrect: 0 }
    },
    incorrectQuestions: {},
    bestStreak: 0,
    currentStreak: 0,
    lastAnswerCorrect: false
  };
}

// Migrate legacy history to extended format
export function migrateToExtendedHistory(legacy: LegacyExamHistory): ExtendedExamHistory {
  const extended = createEmptyExtendedHistory();

  extended.totalQuestionsAnswered = legacy.totalQuestionsAnswered;
  extended.totalCorrectAnswers = legacy.totalCorrectAnswers;
  extended.overallPercentage = legacy.overallPercentage;

  // Convert legacy entries (without topic data)
  extended.entries = legacy.entries.map(entry => ({
    ...entry,
    topicStats: {
      'Network Fundamentals': { total: 0, correct: 0 },
      'Network Access': { total: 0, correct: 0 },
      'IP Connectivity': { total: 0, correct: 0 },
      'IP Services': { total: 0, correct: 0 },
      'Security Fundamentals': { total: 0, correct: 0 },
      'Automation and Programmability': { total: 0, correct: 0 }
    },
    incorrectQuestionIds: [],
    longestStreakInExam: 0
  }));

  return extended;
}

// Check if history is in extended format
export function isExtendedHistory(history: any): history is ExtendedExamHistory {
  return history &&
         typeof history.topicStats === 'object' &&
         typeof history.bestStreak === 'number';
}
