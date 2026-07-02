import { examTopics } from './topics'

export interface ExamScore {
  examId: string
  attemptId: string
  pdfFileName: string
  totalQuestions: number
  answeredQuestions: number
  score: number
  completedAt: number
  timeSpent: number
  difficulty: {
    easy: { total: number; answered: number }
    medium: { total: number; answered: number }
    hard: { total: number; answered: number }
  }
  topicsCovered: number[]
}

export interface TopicMastery {
  topicId: number
  topicTitle: string
  timesAppeared: number
  timesAnswered: number
  lastPracticed?: number
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
}

export interface ProgressStats {
  totalExamsCompleted: number
  totalQuestionsAnswered: number
  averageScore: number
  averageCompletionRate: number
  topicsMastered: number
  strongTopics: TopicMastery[]
  weakTopics: TopicMastery[]
  recentScores: number[]
  improvementTrend: 'improving' | 'stable' | 'declining'
}

export function calculateExamScore(
  questions: any[],
  userAnswers: Record<string, string>
): ExamScore {
  const totalQuestions = questions.length
  const answeredQuestions = Object.keys(userAnswers).filter(
    (qId) => userAnswers[qId]?.trim().length > 0
  ).length

  const score = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

  const difficulty = {
    easy: { total: 0, answered: 0 },
    medium: { total: 0, answered: 0 },
    hard: { total: 0, answered: 0 }
  }

  const topicsCovered: number[] = []

  questions.forEach((q) => {
    difficulty[q.difficulty].total++
    if (userAnswers[q.id]?.trim().length > 0) {
      difficulty[q.difficulty].answered++
    }
    if (q.relatedTopics) {
      topicsCovered.push(...q.relatedTopics)
    }
  })

  return {
    examId: '',
    attemptId: '',
    pdfFileName: '',
    totalQuestions,
    answeredQuestions,
    score: Math.round(score),
    completedAt: 0,
    timeSpent: 0,
    difficulty,
    topicsCovered: [...new Set(topicsCovered)]
  }
}

export function calculateTopicMastery(
  exams: any[],
  attempts: any[]
): TopicMastery[] {
  const topicStats = new Map<number, {
    appeared: number
    answered: number
    lastPracticed: number
  }>()

  attempts.forEach((attempt) => {
    if (!attempt.completedAt) return

    const exam = exams.find((e) => e.id === attempt.examId)
    if (!exam) return

    exam.questions.forEach((q: any) => {
      const topics = q.relatedTopics || []
      topics.forEach((topicId: number) => {
        const existing = topicStats.get(topicId) || {
          appeared: 0,
          answered: 0,
          lastPracticed: 0
        }

        existing.appeared++
        if (attempt.userAnswers[q.id]?.trim().length > 0) {
          existing.answered++
        }
        existing.lastPracticed = Math.max(existing.lastPracticed, attempt.completedAt)

        topicStats.set(topicId, existing)
      })
    })
  })

  return Array.from(topicStats.entries()).map(([topicId, stats]) => {
    const topic = examTopics.find((t) => t.id === topicId)
    const answerRate = stats.appeared > 0 ? stats.answered / stats.appeared : 0

    let masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'beginner'
    if (stats.appeared >= 10 && answerRate >= 0.9) masteryLevel = 'expert'
    else if (stats.appeared >= 6 && answerRate >= 0.75) masteryLevel = 'advanced'
    else if (stats.appeared >= 3 && answerRate >= 0.6) masteryLevel = 'intermediate'

    return {
      topicId,
      topicTitle: topic?.title || `Thema ${topicId}`,
      timesAppeared: stats.appeared,
      timesAnswered: stats.answered,
      lastPracticed: stats.lastPracticed > 0 ? stats.lastPracticed : undefined,
      masteryLevel
    }
  }).sort((a, b) => b.timesAppeared - a.timesAppeared)
}

export function calculateProgressStats(
  exams: any[],
  attempts: any[]
): ProgressStats {
  const completedAttempts = attempts.filter((a) => a.completedAt)
  const totalExamsCompleted = completedAttempts.length

  let totalQuestionsAnswered = 0
  let totalScore = 0
  let totalCompletionRate = 0
  const recentScores: number[] = []

  completedAttempts.forEach((attempt) => {
    const exam = exams.find((e) => e.id === attempt.examId)
    if (!exam) return

    const answered = Object.keys(attempt.userAnswers).filter(
      (qId) => attempt.userAnswers[qId]?.trim().length > 0
    ).length

    const score = exam.questions.length > 0 
      ? (answered / exam.questions.length) * 100 
      : 0

    totalQuestionsAnswered += answered
    totalScore += score
    totalCompletionRate += (answered / exam.questions.length) * 100
    recentScores.push(Math.round(score))
  })

  const averageScore = totalExamsCompleted > 0 
    ? totalScore / totalExamsCompleted 
    : 0
  
  const averageCompletionRate = totalExamsCompleted > 0 
    ? totalCompletionRate / totalExamsCompleted 
    : 0

  const topicMastery = calculateTopicMastery(exams, attempts)
  const topicsMastered = topicMastery.filter(
    (t) => t.masteryLevel === 'advanced' || t.masteryLevel === 'expert'
  ).length

  const strongTopics = topicMastery
    .filter((t) => t.timesAppeared >= 3)
    .sort((a, b) => {
      const aRate = a.timesAnswered / a.timesAppeared
      const bRate = b.timesAnswered / b.timesAppeared
      return bRate - aRate
    })
    .slice(0, 5)

  const weakTopics = topicMastery
    .filter((t) => t.timesAppeared >= 2)
    .sort((a, b) => {
      const aRate = a.timesAnswered / a.timesAppeared
      const bRate = b.timesAnswered / b.timesAppeared
      return aRate - bRate
    })
    .slice(0, 5)

  let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable'
  if (recentScores.length >= 3) {
    const recent = recentScores.slice(-3)
    const older = recentScores.slice(-6, -3)
    
    if (older.length >= 3) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
      
      if (recentAvg > olderAvg + 5) improvementTrend = 'improving'
      else if (recentAvg < olderAvg - 5) improvementTrend = 'declining'
    }
  }

  return {
    totalExamsCompleted,
    totalQuestionsAnswered,
    averageScore: Math.round(averageScore),
    averageCompletionRate: Math.round(averageCompletionRate),
    topicsMastered,
    strongTopics,
    weakTopics,
    recentScores: recentScores.slice(-10),
    improvementTrend
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

export function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' {
  if (score >= 80) return 'default'
  if (score >= 60) return 'secondary'
  return 'destructive'
}

export function getMasteryColor(level: string): string {
  switch (level) {
    case 'expert': return 'text-purple-600'
    case 'advanced': return 'text-green-600'
    case 'intermediate': return 'text-blue-600'
    default: return 'text-gray-600'
  }
}

export function getMasteryBadgeVariant(
  level: string
): 'default' | 'secondary' | 'outline' {
  switch (level) {
    case 'expert':
    case 'advanced':
      return 'default'
    case 'intermediate':
      return 'secondary'
    default:
      return 'outline'
  }
}
