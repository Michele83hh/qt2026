// Smart Practice Types based on Spaced Repetition (Anki-style)

export interface ReviewCard {
  questionId: string;
  easinessFactor: number; // 1.3 to 2.5 (default 2.5)
  interval: number; // Days until next review
  repetitions: number; // Number of consecutive correct answers
  nextReview: number; // Timestamp of next review
  lastReview: number; // Timestamp of last review
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
}

export interface SmartPracticeSession {
  startTime: number;
  endTime?: number;
  questionsReviewed: number;
  correctAnswers: number;
  incorrectAnswers: number;
}

export interface SmartPracticeHistory {
  cards: Record<string, ReviewCard>; // questionId -> ReviewCard
  sessions: SmartPracticeSession[];
  totalQuestionsReviewed: number;
  totalCorrect: number;
  totalIncorrect: number;
}

export enum ReviewQuality {
  AGAIN = 0,      // Complete blackout
  HARD = 1,       // Incorrect, but remembered upon seeing answer
  GOOD = 2,       // Correct with serious difficulty
  EASY = 3        // Correct with perfect recall
}

// SM-2 Algorithm constants
export const SM2_CONSTANTS = {
  MIN_EASINESS_FACTOR: 1.3,
  DEFAULT_EASINESS_FACTOR: 2.5,
  INITIAL_INTERVAL: 1,
  EASY_BONUS: 1.3
};
