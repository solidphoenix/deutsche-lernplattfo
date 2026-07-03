import { appDb } from '../db.js'
import type { ExamAttempt } from '../types.js'

function mapAttemptRow(row: {
  id: string
  exam_id: string
  started_at: number
  completed_at: number | null
  prep_notes: string
  user_answers_json: string
}): ExamAttempt {
  return {
    id: row.id,
    examId: row.exam_id,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    prepNotes: row.prep_notes,
    userAnswers: JSON.parse(row.user_answers_json)
  }
}

export function listAttempts(): ExamAttempt[] {
  const rows = appDb
    .prepare(
      `SELECT id, exam_id, started_at, completed_at, prep_notes, user_answers_json
       FROM attempts
       ORDER BY created_at DESC`
    )
    .all() as Array<{
      id: string
      exam_id: string
      started_at: number
      completed_at: number | null
      prep_notes: string
      user_answers_json: string
    }>

  return rows.map(mapAttemptRow)
}

export function insertAttempt(attempt: ExamAttempt) {
  appDb
    .prepare(
      `INSERT INTO attempts (id, exam_id, started_at, completed_at, prep_notes, user_answers_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      attempt.id,
      attempt.examId,
      attempt.startedAt,
      attempt.completedAt ?? null,
      attempt.prepNotes,
      JSON.stringify(attempt.userAnswers),
      Date.now()
    )
}
