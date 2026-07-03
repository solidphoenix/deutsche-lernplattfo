import type { ExamAttempt, GeneratedExam, Question } from './types'
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

export function calculateExamScore(questions: Question[], userAnswers: Record<string, string>): ExamScore {
  const totalQuestions = questions.length
  const answeredQuestions = Object.keys(userAnswers).filter(
    (questionId) => userAnswers[questionId]?.trim().length > 0
  ).length
  const score = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0
  const difficulty = {
    easy: { total: 0, answered: 0 },
    medium: { total: 0, answered: 0 },
    hard: { total: 0, answered: 0 }
  }
  const topicsCovered: number[] = []

  questions.forEach((question) => {
    difficulty[question.difficulty].total += 1
    if (userAnswers[question.id]?.trim().length > 0) {
      difficulty[question.difficulty].answered += 1
    }
    topicsCovered.push(...question.relatedTopics)
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

export function calculateTopicMastery(exams: GeneratedExam[], attempts: ExamAttempt[]): TopicMastery[] {
  const topicStats = new Map<number, { appeared: number; answered: number; lastPracticed: number }>()

  attempts.forEach((attempt) => {
    if (!attempt.completedAt) {
      return
    }

    const exam = exams.find((entry) => entry.id === attempt.examId)
    if (!exam) {
      return
    }

    exam.questions.forEach((question) => {
      question.relatedTopics.forEach((topicId) => {
        const current = topicStats.get(topicId) ?? { appeared: 0, answered: 0, lastPracticed: 0 }
        current.appeared += 1
        if (attempt.userAnswers[question.id]?.trim().length > 0) {
          current.answered += 1
        }
        current.lastPracticed = Math.max(current.lastPracticed, attempt.completedAt ?? 0)
        topicStats.set(topicId, current)
      })
    })
  })

  return [...topicStats.entries()]
    .map(([topicId, stats]) => {
      const topic = examTopics.find((entry) => entry.id === topicId)
      const answerRate = stats.appeared > 0 ? stats.answered / stats.appeared : 0

      let masteryLevel: TopicMastery['masteryLevel'] = 'beginner'
      if (stats.appeared >= 10 && answerRate >= 0.9) masteryLevel = 'expert'
      else if (stats.appeared >= 6 && answerRate >= 0.75) masteryLevel = 'advanced'
      else if (stats.appeared >= 3 && answerRate >= 0.6) masteryLevel = 'intermediate'

      return {
        topicId,
        topicTitle: topic?.title ?? `Thema ${topicId}`,
        timesAppeared: stats.appeared,
        timesAnswered: stats.answered,
        lastPracticed: stats.lastPracticed > 0 ? stats.lastPracticed : undefined,
        masteryLevel
      }
    })
    .sort((left, right) => right.timesAppeared - left.timesAppeared)
}

export function calculateProgressStats(exams: GeneratedExam[], attempts: ExamAttempt[]): ProgressStats {
  const completedAttempts = attempts.filter((attempt) => attempt.completedAt)
  let totalQuestionsAnswered = 0
  let totalScore = 0
  let totalCompletionRate = 0
  const recentScores: number[] = []

  completedAttempts.forEach((attempt) => {
    const exam = exams.find((entry) => entry.id === attempt.examId)
    if (!exam) {
      return
    }

    const answeredQuestions = Object.keys(attempt.userAnswers).filter(
      (questionId) => attempt.userAnswers[questionId]?.trim().length > 0
    ).length
    const score = exam.questions.length > 0 ? (answeredQuestions / exam.questions.length) * 100 : 0

    totalQuestionsAnswered += answeredQuestions
    totalScore += score
    totalCompletionRate += score
    recentScores.push(Math.round(score))
  })

  const topicMastery = calculateTopicMastery(exams, attempts)
  const totalExamsCompleted = completedAttempts.length
  const averageScore = totalExamsCompleted > 0 ? totalScore / totalExamsCompleted : 0
  const averageCompletionRate = totalExamsCompleted > 0 ? totalCompletionRate / totalExamsCompleted : 0
  const strongTopics = topicMastery
    .filter((topic) => topic.timesAppeared >= 3)
    .sort((left, right) => right.timesAnswered / right.timesAppeared - left.timesAnswered / left.timesAppeared)
    .slice(0, 5)
  const weakTopics = topicMastery
    .filter((topic) => topic.timesAppeared >= 2)
    .sort((left, right) => left.timesAnswered / left.timesAppeared - right.timesAnswered / right.timesAppeared)
    .slice(0, 5)

  let improvementTrend: ProgressStats['improvementTrend'] = 'stable'
  if (recentScores.length >= 6) {
    const recentAverage = recentScores.slice(-3).reduce((sum, score) => sum + score, 0) / 3
    const previousAverage = recentScores.slice(-6, -3).reduce((sum, score) => sum + score, 0) / 3
    if (recentAverage > previousAverage + 5) improvementTrend = 'improving'
    else if (recentAverage < previousAverage - 5) improvementTrend = 'declining'
  }

  return {
    totalExamsCompleted,
    totalQuestionsAnswered,
    averageScore: Math.round(averageScore),
    averageCompletionRate: Math.round(averageCompletionRate),
    topicsMastered: topicMastery.filter((topic) => ['advanced', 'expert'].includes(topic.masteryLevel)).length,
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
    case 'expert':
      return 'text-purple-600'
    case 'advanced':
      return 'text-green-600'
    case 'intermediate':
      return 'text-blue-600'
    default:
      return 'text-gray-600'
  }
}

export function getMasteryBadgeVariant(level: string): 'default' | 'secondary' | 'outline' {
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
