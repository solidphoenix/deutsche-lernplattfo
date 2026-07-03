export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  question: string
  suggestedAnswer: string
  difficulty: Difficulty
  relatedTopics: number[]
}

export interface GeneratedExam {
  id: string
  fallbeispielId: string
  pdfFileName: string
  createdAt: number
  questions: Question[]
}

export interface ExamAttempt {
  id: string
  examId: string
  startedAt: number
  completedAt?: number
  prepNotes: string
  userAnswers: Record<string, string>
}

export interface FallbeispielSummary {
  id: string
  displayName: string
}
