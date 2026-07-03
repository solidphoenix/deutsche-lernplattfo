import { appDb } from '../db.js'
import type { GeneratedExam } from '../types.js'

function mapExamRow(row: {
  id: string
  fallbeispiel_id: string
  pdf_file_name: string
  created_at: number
  questions_json: string
}): GeneratedExam {
  return {
    id: row.id,
    fallbeispielId: row.fallbeispiel_id,
    pdfFileName: row.pdf_file_name,
    createdAt: row.created_at,
    questions: JSON.parse(row.questions_json)
  }
}

export function listExams(): GeneratedExam[] {
  const rows = appDb
    .prepare(`SELECT id, fallbeispiel_id, pdf_file_name, created_at, questions_json FROM exams ORDER BY created_at DESC`)
    .all() as Array<{
      id: string
      fallbeispiel_id: string
      pdf_file_name: string
      created_at: number
      questions_json: string
    }>

  return rows.map(mapExamRow)
}

export function getExamById(id: string): GeneratedExam | undefined {
  const row = appDb
    .prepare(`SELECT id, fallbeispiel_id, pdf_file_name, created_at, questions_json FROM exams WHERE id = ?`)
    .get(id) as
    | {
        id: string
        fallbeispiel_id: string
        pdf_file_name: string
        created_at: number
        questions_json: string
      }
    | undefined

  return row ? mapExamRow(row) : undefined
}

export function insertExam(exam: GeneratedExam) {
  appDb
    .prepare(
      `INSERT INTO exams (id, fallbeispiel_id, pdf_file_name, created_at, questions_json)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(exam.id, exam.fallbeispielId, exam.pdfFileName, exam.createdAt, JSON.stringify(exam.questions))
}
