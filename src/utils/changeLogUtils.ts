import { ChangeLog, ChangeLogEntry, ChangeType, DEFAULT_MAX_ENTRIES } from '../types/ChangeLog';

const STORAGE_KEY = 'question-change-log';

/**
 * Load change log from localStorage
 */
export function loadChangeLog(): ChangeLog {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading change log:', error);
  }

  return {
    entries: [],
    maxEntries: DEFAULT_MAX_ENTRIES
  };
}

/**
 * Save change log to localStorage
 */
export function saveChangeLog(log: ChangeLog): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch (error) {
    console.error('Error saving change log:', error);
  }
}

/**
 * Add a new entry to the change log
 * Automatically trims old entries if exceeding maxEntries
 */
export function addChangeLogEntry(
  type: ChangeType,
  questionId: string,
  questionText: string,
  category: string,
  changes?: string
): void {
  const log = loadChangeLog();

  const newEntry: ChangeLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type,
    questionId,
    questionText: questionText.substring(0, 100).replace(/<[^>]*>/g, ''), // Strip HTML and limit length
    category,
    changes
  };

  // Add to beginning (newest first)
  log.entries.unshift(newEntry);

  // Trim to max entries
  if (log.entries.length > log.maxEntries) {
    log.entries = log.entries.slice(0, log.maxEntries);
  }

  saveChangeLog(log);
}

/**
 * Get recent entries (default: 50)
 */
export function getRecentEntries(count: number = 50): ChangeLogEntry[] {
  const log = loadChangeLog();
  return log.entries.slice(0, count);
}

/**
 * Get entries by type
 */
export function getEntriesByType(type: ChangeType, count: number = 50): ChangeLogEntry[] {
  const log = loadChangeLog();
  return log.entries.filter(e => e.type === type).slice(0, count);
}

/**
 * Get entries for a specific question
 */
export function getEntriesForQuestion(questionId: string): ChangeLogEntry[] {
  const log = loadChangeLog();
  return log.entries.filter(e => e.questionId === questionId);
}

/**
 * Clear all entries (with confirmation recommended)
 */
export function clearChangeLog(): void {
  const log: ChangeLog = {
    entries: [],
    maxEntries: DEFAULT_MAX_ENTRIES
  };
  saveChangeLog(log);
}

/**
 * Format timestamp to human-readable date/time
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Gerade eben';
  if (diffMins < 60) return `vor ${diffMins} Min`;
  if (diffHours < 24) return `vor ${diffHours} Std`;
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;

  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get statistics about changes
 */
export function getChangeLogStats() {
  const log = loadChangeLog();

  const stats = {
    total: log.entries.length,
    added: log.entries.filter(e => e.type === 'add').length,
    edited: log.entries.filter(e => e.type === 'edit').length,
    deleted: log.entries.filter(e => e.type === 'delete').length,

    // Last 7 days activity
    last7Days: log.entries.filter(e => {
      const age = Date.now() - e.timestamp;
      return age < 7 * 24 * 60 * 60 * 1000;
    }).length,

    // Last 30 days activity
    last30Days: log.entries.filter(e => {
      const age = Date.now() - e.timestamp;
      return age < 30 * 24 * 60 * 60 * 1000;
    }).length
  };

  return stats;
}
