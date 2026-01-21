/**
 * Safe data validation and parsing utilities
 * Prevents crashes from corrupted localStorage data
 */

import { Question } from '../types/Question';
import { ExtendedExamHistory, isExtendedHistory, createEmptyExtendedHistory, migrateToExtendedHistory } from '../types/Progress';
import { STORAGE_KEYS } from './constants';

/**
 * Safely parse JSON with error handling
 * Returns null if parsing fails instead of throwing
 */
export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback;

  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('JSON parse error, using fallback:', error);
    return fallback;
  }
}

/**
 * Safely get and parse exam history from localStorage
 * Handles migration from legacy format automatically
 */
export function loadExamHistory(): ExtendedExamHistory {
  try {
    const json = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
    if (!json) return createEmptyExtendedHistory();

    const parsed = JSON.parse(json);

    if (isExtendedHistory(parsed)) {
      return parsed;
    }

    // Migrate legacy format
    return migrateToExtendedHistory(parsed);
  } catch (error) {
    console.error('Error loading exam history:', error);
    return createEmptyExtendedHistory();
  }
}

/**
 * Safely save exam history to localStorage
 * Returns success status
 */
export function saveExamHistory(history: ExtendedExamHistory): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Error saving exam history:', error);
    // Likely quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded - consider clearing old data');
    }
    return false;
  }
}

/**
 * Check if a user's answer is correct for any question type
 * Centralized logic to avoid duplication
 */
export function isAnswerCorrect(
  question: Question,
  userAnswer: number[],
  dragDropAnswer?: Record<number, string>,
  matchingAnswer?: Record<string, string>
): boolean {
  // Drag and drop questions
  if (question.type === 'drag-and-drop' && question.dragDropData) {
    if (!dragDropAnswer) return false;
    const entries = Object.entries(dragDropAnswer);
    if (entries.length !== question.dragDropData.items.length) return false;
    return entries.every(
      ([itemIdx, categoryId]) =>
        question.dragDropData!.correctMapping[parseInt(itemIdx)] === categoryId
    );
  }

  // Matching questions
  if (question.type === 'matching' && question.matchingData) {
    if (!matchingAnswer) return false;
    const entries = Object.entries(matchingAnswer);
    if (entries.length !== question.matchingData.leftColumn.length) return false;
    return entries.every(
      ([leftId, rightId]) =>
        question.matchingData!.correctMatches[leftId] === rightId
    );
  }

  // Multiple choice questions (single and multiple)
  // Empty answer is NEVER correct
  if (userAnswer.length === 0) return false;
  if (userAnswer.length !== question.correctAnswer.length) return false;
  return userAnswer.every(a => question.correctAnswer.includes(a));
}

/**
 * Validate question object has required fields
 */
export function isValidQuestion(q: unknown): q is Question {
  if (!q || typeof q !== 'object') return false;
  const question = q as Record<string, unknown>;

  return (
    typeof question.id === 'string' &&
    typeof question.question === 'string' &&
    Array.isArray(question.options) &&
    Array.isArray(question.correctAnswer) &&
    typeof question.topic === 'string'
  );
}

/**
 * Estimate localStorage usage in bytes
 */
export function getLocalStorageSize(): number {
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
    }
  }
  return total;
}

/**
 * Check if localStorage is near capacity
 */
export function isStorageNearCapacity(thresholdPercent = 80): boolean {
  const used = getLocalStorageSize();
  const limit = 5 * 1024 * 1024; // 5MB conservative estimate
  return (used / limit) * 100 >= thresholdPercent;
}
