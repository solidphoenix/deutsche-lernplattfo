export type LearningStatus = 'not-started' | 'in-progress' | 'completed'

export interface PDFDocument {
  id: string
  topicId: number
  fileName: string
  fileData: string
  uploadDate: number
  fileSize: number
}

export interface TopicProgress {
  topicId: number
  status: LearningStatus
}
