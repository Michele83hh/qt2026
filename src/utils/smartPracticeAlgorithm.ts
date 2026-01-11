import { ReviewCard, ReviewQuality, SM2_CONSTANTS, SmartPracticeHistory } from '../types/SmartPractice';

/**
 * SM-2 Algorithm Implementation (SuperMemo 2)
 * This is the algorithm used by Anki for spaced repetition
 */
export function calculateNextReview(
  card: ReviewCard,
  quality: ReviewQuality
): ReviewCard {
  const now = Date.now();

  // Calculate new easiness factor
  let newEF = card.easinessFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));

  // Ensure EF stays within bounds
  if (newEF < SM2_CONSTANTS.MIN_EASINESS_FACTOR) {
    newEF = SM2_CONSTANTS.MIN_EASINESS_FACTOR;
  }

  let newInterval: number;
  let newRepetitions: number;

  if (quality < ReviewQuality.GOOD) {
    // Incorrect answer - reset
    newRepetitions = 0;
    newInterval = SM2_CONSTANTS.INITIAL_INTERVAL;
  } else {
    // Correct answer
    newRepetitions = card.repetitions + 1;

    if (newRepetitions === 1) {
      newInterval = SM2_CONSTANTS.INITIAL_INTERVAL;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(card.interval * newEF);
    }

    // Easy bonus
    if (quality === ReviewQuality.EASY) {
      newInterval = Math.round(newInterval * SM2_CONSTANTS.EASY_BONUS);
    }
  }

  return {
    ...card,
    easinessFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    lastReview: now,
    nextReview: now + newInterval * 24 * 60 * 60 * 1000, // Convert days to milliseconds
    totalReviews: card.totalReviews + 1,
    correctCount: quality >= ReviewQuality.GOOD ? card.correctCount + 1 : card.correctCount,
    incorrectCount: quality < ReviewQuality.GOOD ? card.incorrectCount + 1 : card.incorrectCount
  };
}

/**
 * Create a new review card for a question
 */
export function createNewCard(questionId: string): ReviewCard {
  const now = Date.now();
  return {
    questionId,
    easinessFactor: SM2_CONSTANTS.DEFAULT_EASINESS_FACTOR,
    interval: 0,
    repetitions: 0,
    nextReview: now, // Due immediately
    lastReview: 0,
    totalReviews: 0,
    correctCount: 0,
    incorrectCount: 0
  };
}

/**
 * Get questions that are due for review
 * Sorted by: overdue amount (most overdue first)
 */
export function getDueQuestions(
  allQuestionIds: string[],
  history: SmartPracticeHistory
): string[] {
  const now = Date.now();
  const dueQuestions: Array<{ id: string; overdue: number }> = [];

  for (const questionId of allQuestionIds) {
    const card = history.cards[questionId];

    if (!card) {
      // New question - add it
      dueQuestions.push({ id: questionId, overdue: Infinity }); // New cards have highest priority
    } else if (card.nextReview <= now) {
      // Question is due
      const overdue = now - card.nextReview;
      dueQuestions.push({ id: questionId, overdue });
    }
  }

  // Sort by overdue amount (descending)
  dueQuestions.sort((a, b) => {
    if (a.overdue === Infinity && b.overdue === Infinity) return 0;
    if (a.overdue === Infinity) return -1;
    if (b.overdue === Infinity) return 1;
    return b.overdue - a.overdue;
  });

  return dueQuestions.map(q => q.id);
}

/**
 * Get statistics for the smart practice system
 */
export function getSmartPracticeStats(history: SmartPracticeHistory, totalQuestions: number) {
  const now = Date.now();

  let dueCount = 0;
  let newCount = 0;
  let learningCount = 0; // repetitions < 3
  let matureCount = 0;   // repetitions >= 3

  for (let i = 0; i < totalQuestions; i++) {
    const questionId = `question-${i}`; // Adjust based on your ID scheme
    const card = history.cards[questionId];

    if (!card) {
      newCount++;
      dueCount++;
    } else {
      if (card.nextReview <= now) {
        dueCount++;
      }

      if (card.repetitions < 3) {
        learningCount++;
      } else {
        matureCount++;
      }
    }
  }

  const accuracy = history.totalQuestionsReviewed > 0
    ? Math.round((history.totalCorrect / history.totalQuestionsReviewed) * 100)
    : 0;

  return {
    dueCount,
    newCount,
    learningCount,
    matureCount,
    totalReviewed: history.totalQuestionsReviewed,
    accuracy,
    totalCorrect: history.totalCorrect,
    totalIncorrect: history.totalIncorrect
  };
}

/**
 * Initialize empty history
 */
export function createEmptyHistory(): SmartPracticeHistory {
  return {
    cards: {},
    sessions: [],
    totalQuestionsReviewed: 0,
    totalCorrect: 0,
    totalIncorrect: 0
  };
}
