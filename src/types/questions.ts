// CCNA Question Database Types

export type CCNACategory =
  | 'network-fundamentals'
  | 'network-access'
  | 'ip-connectivity'
  | 'ip-services'
  | 'security-fundamentals'
  | 'automation-programmability';

export type ReportTarget = 'question' | 'option' | 'answer' | 'explanation';

export interface QuestionReport {
  id: string; // Eindeutige Report-ID
  questionId: string; // Referenz zur Frage
  reportedAt: Date;
  target: ReportTarget; // Was ist fehlerhaft?
  targetIndex?: number; // Bei 'option': welche Option (0-4)?
  reportType: 'wrong_answer' | 'typo' | 'unclear' | 'missing_info' | 'other';
  description: string; // User-Beschreibung des Fehlers
  status: 'pending' | 'reviewed' | 'fixed'; // Bearbeitungsstatus
  originalValue?: string; // Ursprünglicher Wert zur Referenz
}

export interface Question {
  id: string;
  questionNumber: number;

  // 1:1 von Screenshot übernommen
  questionText: string;
  options: string[]; // Mindestens 3 Optionen

  // Korrekte Antworten (Array für "Choose two/three" Fragen)
  correctAnswerIndexes: number[]; // z.B. [0] für single choice, [1, 3] für "choose two"
  multipleAnswers: boolean; // true wenn "Choose two/three"

  // Original-Erklärung von Screenshot
  explanation: string;
  topicReference?: string; // z.B. "Topic 1.8.0" - für spätere Referenzierung

  // Automatische Kategorisierung
  category: CCNACategory;

  // Schwierigkeitsgrad
  difficulty?: 'easy' | 'medium' | 'hard';

  // Bilder/Diagramme
  image?: {
    type: 'base64' | 'url';
    data: string; // Base64 string oder URL/Pfad
    alt?: string; // Beschreibung für Barrierefreiheit
  };

  // Qualitätssicherung
  needsReview: boolean; // true wenn bei Extraktion unsicher
  extractionConfidence: 'high' | 'medium' | 'low';

  // User-Fehlerberichte
  reportedIssues?: QuestionReport[];
}

export interface QuestionDatabase {
  version: string;
  lastUpdated: Date;
  totalQuestions: number;
  questions: Question[];
  duplicates?: {
    questionIds: string[];
    reason: string;
  }[];
}

// Separate Fehlerberichte-Datenbank
export interface ErrorReportsDatabase {
  version: string;
  lastUpdated: Date;
  totalReports: number;
  pendingReports: number;
  reports: QuestionReport[];
}

// Statistiken für Review-Dashboard
export interface ReviewStats {
  totalQuestions: number;
  questionsWithReports: number;
  reportsByType: Record<QuestionReport['reportType'], number>;
  reportsByTarget: Record<ReportTarget, number>;
  reportsByStatus: Record<QuestionReport['status'], number>;
}

// Kategorie-Mapping für UI
export const CATEGORY_LABELS: Record<CCNACategory, string> = {
  'network-fundamentals': 'Network Fundamentals (20%)',
  'network-access': 'Network Access (20%)',
  'ip-connectivity': 'IP Connectivity (25%)',
  'ip-services': 'IP Services (10%)',
  'security-fundamentals': 'Security Fundamentals (15%)',
  'automation-programmability': 'Automation and Programmability (10%)'
};
