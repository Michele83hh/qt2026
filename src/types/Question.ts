export type QuestionType =
  | 'multiple-choice-single'
  | 'multiple-choice-multiple'
  | 'true-false'
  | 'drag-and-drop'
  | 'matching'
  | 'ordering';

export type Topic =
  | 'Network Fundamentals'
  | 'Network Access'
  | 'IP Connectivity'
  | 'IP Services'
  | 'Security Fundamentals'
  | 'Automation and Programmability';

export type Difficulty = 'easy' | 'medium' | 'hard';

// Drag & Drop specific data
export interface DragDropData {
  items: string[]; // Items to drag
  categories: {
    id: string;
    label: string;
  }[]; // Drop zones/categories
  correctMapping: {
    [itemIndex: number]: string; // itemIndex -> categoryId
  };
}

// Matching specific data
export interface MatchingData {
  leftColumn: {
    id: string;
    label: string;
  }[]; // Items on the left
  rightColumn: {
    id: string;
    label: string;
  }[]; // Items on the right
  correctMatches: {
    [leftId: string]: string; // leftId -> rightId
  };
}

// Ordering/Sequence specific data
export interface OrderingData {
  items: {
    id: string;
    label: string;
  }[]; // Items to be ordered
  correctOrder: string[]; // Array of IDs in correct order
}

export interface Question {
  id: string;
  topic: Topic;
  subtopic: string;
  difficulty: Difficulty;
  type: QuestionType;
  question: string;
  options: string[]; // Used for multiple-choice
  correctAnswer: number[]; // Array of indices (0-based) - for multiple-choice
  explanation: string;
  references: string[];
  tags: string[];
  image?: {
    type: 'base64' | 'url';
    data: string;
    alt?: string;
  };
  // For drag-and-drop questions
  dragDropData?: DragDropData;
  // For matching questions
  matchingData?: MatchingData;
  // For ordering questions
  orderingData?: OrderingData;
}

export interface ExamSession {
  id: string;
  date: Date;
  questions: Question[];
  userAnswers: Map<string, number[]>;
  timeStarted: Date;
  timeEnded?: Date;
  score?: number;
  passed?: boolean;
}

export interface PracticeSession {
  topic?: Topic;
  difficulty?: Difficulty;
  questionsAnswered: number;
  correctAnswers: number;
}
