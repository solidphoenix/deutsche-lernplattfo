export type LearningStatus = 'not-started' | 'in-progress' | 'completed'

export interface PDFDocument {
  id: string
  topicId: number
  fileName: string
  fileData: string
  uploadDate: number
  fileSize: number
  extractedText?: string
  story?: string
}

export interface TopicProgress {
  topicId: number
  status: LearningStatus
}

export interface Question {
  id: string
  pdfId: string
  topicId: number
  question: string
  suggestedAnswer: string
  difficulty: 'easy' | 'medium' | 'hard'
  relatedTopics: number[]
}

export interface GeneratedExam {
  id: string
  name: string
  createdAt: number
  questions: Question[]
  timeLimit: number
  preparationTime: number
}

export interface ExamAttempt {
  id: string
  examId: string
  startedAt: number
  completedAt?: number
  userAnswers: Record<string, string>
  notes: string
}

export interface Flashcard {
  id: string
  topicId: number
  pdfId: string
  front: string
  back: string
  lastReviewed?: number
  correctCount: number
  incorrectCount: number
}
