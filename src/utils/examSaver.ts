import { Question, Topic } from '../types/Question';
import {
  ExtendedExamHistory,
  ExtendedExamHistoryEntry,
  StoredUserAnswers,
  StoredQuestion,
  createEmptyExtendedHistory
} from '../types/Progress';
import { loadExamHistory, saveExamHistory, isAnswerCorrect } from './validation';
import { CCNA_PASSING_SCORE, MAX_EXAM_HISTORY_ENTRIES } from './constants';

interface SaveExamParams {
  questions: Question[];
  answers: Map<string, number[]>;
  dragDropAnswers: Map<string, { [itemIndex: number]: string }>;
  matchingAnswers: Map<string, { [leftId: string]: string }>;
}

export function saveExamResults({
  questions,
  answers,
  dragDropAnswers,
  matchingAnswers
}: SaveExamParams): void {
  try {
    // Use safe loading with validation and migration
    let history = loadExamHistory();

    // Calculate scores using centralized helper
    let correctCount = 0;
    questions.forEach(question => {
      const userAnswer = answers.get(question.id) || [];
      const dragDrop = dragDropAnswers.get(question.id);
      const matching = matchingAnswers.get(question.id);

      if (isAnswerCorrect(question, userAnswer, dragDrop, matching)) {
        correctCount++;
      }
    });

    const totalQuestions = questions.length;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = percentage >= CCNA_PASSING_SCORE;

    // Build topic stats for this exam
    const examTopicStats: Record<Topic, { total: number; correct: number }> = {
      'Network Fundamentals': { total: 0, correct: 0 },
      'Network Access': { total: 0, correct: 0 },
      'IP Connectivity': { total: 0, correct: 0 },
      'IP Services': { total: 0, correct: 0 },
      'Security Fundamentals': { total: 0, correct: 0 },
      'Automation and Programmability': { total: 0, correct: 0 }
    };

    // Collect incorrect question IDs and calculate longest streak
    const incorrectIds: string[] = [];
    let currentStreak = 0;
    let longestStreakInExam = 0;

    questions.forEach(question => {
      const topic = question.topic;
      examTopicStats[topic].total++;

      const userAnswer = answers.get(question.id) || [];
      const dragDrop = dragDropAnswers.get(question.id);
      const matching = matchingAnswers.get(question.id);
      const correct = isAnswerCorrect(question, userAnswer, dragDrop, matching);

      if (correct) {
        examTopicStats[topic].correct++;
        currentStreak++;
        if (currentStreak > longestStreakInExam) {
          longestStreakInExam = currentStreak;
        }
      } else {
        incorrectIds.push(question.id);
        currentStreak = 0;
      }
    });

    // Build stored user answers
    const storedAnswers: StoredUserAnswers = {
      multipleChoice: {},
      dragDrop: {},
      matching: {}
    };

    // Store multiple-choice answers
    answers.forEach((value, key) => {
      storedAnswers.multipleChoice[key] = value;
    });

    // Store drag-drop answers
    dragDropAnswers.forEach((value, key) => {
      storedAnswers.dragDrop[key] = value;
    });

    // Store matching answers
    matchingAnswers.forEach((value, key) => {
      storedAnswers.matching[key] = value;
    });

    // Store shuffled questions for accurate review
    const storedQuestions: StoredQuestion[] = questions.map(q => ({
      id: q.id,
      topic: q.topic,
      subtopic: q.subtopic,
      difficulty: q.difficulty,
      type: q.type,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation
    }));

    // Create new extended entry
    const newEntry: ExtendedExamHistoryEntry = {
      date: new Date().toISOString(),
      totalQuestions,
      correctAnswers: correctCount,
      percentage,
      passed,
      topicStats: examTopicStats,
      incorrectQuestionIds: incorrectIds,
      longestStreakInExam,
      questionIds: questions.map(q => q.id),
      userAnswers: storedAnswers,
      shuffledQuestions: storedQuestions
    };
    history.entries.push(newEntry);

    // Update aggregated totals
    history.totalQuestionsAnswered += totalQuestions;
    history.totalCorrectAnswers += correctCount;
    history.overallPercentage = Math.round(
      (history.totalCorrectAnswers / history.totalQuestionsAnswered) * 100
    );

    // Update aggregated topic stats
    Object.keys(examTopicStats).forEach(topic => {
      const t = topic as Topic;
      history.topicStats[t].totalAnswered += examTopicStats[t].total;
      history.topicStats[t].totalCorrect += examTopicStats[t].correct;
    });

    // Update incorrect questions count
    incorrectIds.forEach(id => {
      history.incorrectQuestions[id] = (history.incorrectQuestions[id] || 0) + 1;
    });

    // Update best streak
    if (longestStreakInExam > history.bestStreak) {
      history.bestStreak = longestStreakInExam;
    }

    // Update current streak (continues from previous if first answer was correct)
    if (questions.length > 0) {
      const firstQuestion = questions[0];
      const firstCorrect = isAnswerCorrect(
        firstQuestion,
        answers.get(firstQuestion.id) || [],
        dragDropAnswers.get(firstQuestion.id),
        matchingAnswers.get(firstQuestion.id)
      );

      if (firstCorrect && history.lastAnswerCorrect) {
        // Continue streak from previous exam
        let streakFromStart = 0;
        for (const q of questions) {
          if (isAnswerCorrect(q, answers.get(q.id) || [], dragDropAnswers.get(q.id), matchingAnswers.get(q.id))) {
            streakFromStart++;
          } else {
            break;
          }
        }
        history.currentStreak += streakFromStart;
      } else {
        // Reset streak to longest streak ending at the end of this exam
        let endStreak = 0;
        for (let i = questions.length - 1; i >= 0; i--) {
          const q = questions[i];
          if (isAnswerCorrect(q, answers.get(q.id) || [], dragDropAnswers.get(q.id), matchingAnswers.get(q.id))) {
            endStreak++;
          } else {
            break;
          }
        }
        history.currentStreak = endStreak;
      }

      // Update best streak if current is higher
      if (history.currentStreak > history.bestStreak) {
        history.bestStreak = history.currentStreak;
      }

      // Track if last answer was correct for next exam
      const lastQuestion = questions[questions.length - 1];
      history.lastAnswerCorrect = isAnswerCorrect(
        lastQuestion,
        answers.get(lastQuestion.id) || [],
        dragDropAnswers.get(lastQuestion.id),
        matchingAnswers.get(lastQuestion.id)
      );
    }

    // Limit history size to prevent localStorage overflow
    if (history.entries.length > MAX_EXAM_HISTORY_ENTRIES) {
      // Remove oldest entries, keep the most recent ones
      history.entries = history.entries.slice(-MAX_EXAM_HISTORY_ENTRIES);
    }

    // Use safe save with error handling
    const saved = saveExamHistory(history);
    if (!saved) {
      console.warn('Failed to save exam history - storage may be full');
    }
  } catch (error) {
    console.error('Error saving exam history:', error);
  }
}
