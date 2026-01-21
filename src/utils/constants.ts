/**
 * Application constants - centralized configuration
 * Avoids magic numbers scattered throughout the codebase
 */

// ============================================
// CCNA EXAM CONFIGURATION
// ============================================

/** Passing score for CCNA exam (real exam: 825/1000 = 82.5%, we use 83%) */
export const CCNA_PASSING_SCORE = 83;

/** Default exam duration in minutes */
export const DEFAULT_EXAM_DURATION_MINUTES = 120;

/** CCNA topic distribution percentages (official Cisco weights) */
export const CCNA_TOPIC_DISTRIBUTION: Record<string, number> = {
  'Network Fundamentals': 0.20,      // 20%
  'Network Access': 0.20,             // 20%
  'IP Connectivity': 0.25,            // 25%
  'IP Services': 0.10,                // 10%
  'Security Fundamentals': 0.15,      // 15%
  'Automation and Programmability': 0.10  // 10%
};

// ============================================
// EXAM READINESS CRITERIA
// ============================================

/** Minimum questions per exam for readiness qualification */
export const READINESS_MIN_QUESTIONS = 130;

/** Minimum percentage for readiness qualification */
export const READINESS_MIN_PERCENTAGE = 90;

/** Consecutive qualifying exams needed for "exam ready" status */
export const READINESS_CONSECUTIVE_EXAMS = 2;

// ============================================
// PRACTICE MODE CONFIGURATION
// ============================================

/** Default practice session duration in minutes */
export const DEFAULT_PRACTICE_DURATION_MINUTES = 30;

/** Minimum practice duration in minutes */
export const MIN_PRACTICE_DURATION_MINUTES = 5;

/** Maximum practice duration in minutes */
export const MAX_PRACTICE_DURATION_MINUTES = 180;

/** Practice mode passing threshold */
export const PRACTICE_PASSING_SCORE = 80;

// ============================================
// SMART PRACTICE (SM-2 Algorithm)
// ============================================

/** Initial easiness factor for new cards */
export const SM2_INITIAL_EASINESS = 2.5;

/** Minimum easiness factor */
export const SM2_MIN_EASINESS = 1.3;

/** First interval in days after first correct answer */
export const SM2_FIRST_INTERVAL_DAYS = 1;

/** Second interval in days */
export const SM2_SECOND_INTERVAL_DAYS = 6;

// ============================================
// UI THRESHOLDS
// ============================================

/** Score thresholds for color coding */
export const SCORE_THRESHOLDS = {
  EXCELLENT: 90,  // Green
  GOOD: 75,       // Blue
  FAIR: 60,       // Amber
  POOR: 0         // Red (below FAIR)
};

/** Topic mastery thresholds */
export const TOPIC_MASTERY = {
  EXCELLENT: 85,
  GOOD: 75,
  NEEDS_IMPROVEMENT: 60,
  WEAKNESS: 0
};

/** Timer warning threshold in seconds (5 minutes) */
export const TIMER_WARNING_SECONDS = 300;

// ============================================
// STORAGE KEYS
// ============================================

export const STORAGE_KEYS = {
  EXAM_HISTORY: 'examHistory',
  SMART_PRACTICE: 'smart-practice-history',
  QUESTION_REPORTS: 'questionReports',
  CHANGE_LOG: 'question-change-log'
};

// ============================================
// LIMITS
// ============================================

/** Maximum exam history entries to keep (prevent localStorage overflow) */
export const MAX_EXAM_HISTORY_ENTRIES = 100;

/** Maximum change log entries */
export const MAX_CHANGE_LOG_ENTRIES = 100;

/** localStorage approximate size limit in bytes (5MB conservative) */
export const LOCAL_STORAGE_LIMIT_BYTES = 5 * 1024 * 1024;
