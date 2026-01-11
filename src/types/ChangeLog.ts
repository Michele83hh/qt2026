export type ChangeType = 'add' | 'edit' | 'delete';

export interface ChangeLogEntry {
  id: string; // Unique log entry ID
  timestamp: number; // Unix timestamp
  type: ChangeType;
  questionId: string;
  questionText: string; // First 100 chars of question for reference
  category: string;
  changes?: string; // Description of what changed
}

export interface ChangeLog {
  entries: ChangeLogEntry[];
  maxEntries: number; // Size limit
}

export const DEFAULT_MAX_ENTRIES = 100;
