import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { appConfig } from './config.js'
import { getFallbeispielById, getFallbeispielPath, fallbeispiele } from './data/fallbeispiele.js'
import { ApiError } from './errors.js'
import { generateExam } from './agent/generate-exam.js'
import { countKnowledgeChunks } from './repositories/knowledge.js'
import { getExamById, insertExam, listExams } from './repositories/exams.js'
import { insertAttempt, listAttempts } from './repositories/attempts.js'
import { buildGroundingExcerpt, extractTextFromPdf } from './services/pdf.js'
import type { ExamAttempt } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendDirectory = existsSync(appConfig.frontendDistDir)
  ? appConfig.frontendDistDir
  : join(__dirname, '..', '..', 'dist')

const app = express()

app.use(express.json({ limit: '2mb' }))
app.use(cors({ origin: appConfig.allowedOrigin || true }))

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    llmProvider: appConfig.llmProvider,
    embeddingProvider: appConfig.embeddingProvider,
    indexedKnowledgeChunks: countKnowledgeChunks(),
    fallbeispiele: fallbeispiele.length
  })
})

app.get('/api/fallbeispiele', (_request, response) => {
  response.json(fallbeispiele.map(({ id, displayName }) => ({ id, displayName })))
})

app.get('/api/exams', (_request, response) => {
  response.json(listExams())
})

app.get('/api/exams/:id', (request, response, next) => {
  try {
    const exam = getExamById(request.params.id)
    if (!exam) {
      throw new ApiError(404, 'Das angeforderte Probeexamen wurde nicht gefunden.')
    }

    response.json(exam)
  } catch (error) {
    next(error)
  }
})

const generateExamSchema = z.object({
  fallbeispielId: z.string().min(1)
})

app.post('/api/exams/generate', async (request, response, next) => {
  try {
    const { fallbeispielId } = generateExamSchema.parse(request.body)
    const fallbeispiel = getFallbeispielById(fallbeispielId)

    if (!fallbeispiel) {
      throw new ApiError(404, 'Das ausgewählte Fallbeispiel wurde nicht gefunden.')
    }

    const filePath = getFallbeispielPath(fallbeispiel.fileName)
    const extractedText = await extractTextFromPdf(filePath)
    const excerpt = buildGroundingExcerpt(extractedText)

    if (excerpt.length < 200) {
      throw new ApiError(422, 'Aus der Fallbeispiel-PDF konnte kein lesbarer Text extrahiert werden.')
    }

    const exam = await generateExam(fallbeispiel, excerpt)
    insertExam(exam)
    response.status(201).json(exam)
  } catch (error) {
    next(error)
  }
})

const attemptSchema = z.object({
  examId: z.string().min(1),
  startedAt: z.number().int().nonnegative(),
  completedAt: z.number().int().nonnegative().optional(),
  prepNotes: z.string().default(''),
  userAnswers: z.record(z.string(), z.string())
})

app.get('/api/attempts', (_request, response) => {
  response.json(listAttempts())
})

app.post('/api/attempts', (request, response, next) => {
  try {
    const payload = attemptSchema.parse(request.body)

    if (!getExamById(payload.examId)) {
      throw new ApiError(404, 'Das zugehörige Probeexamen wurde nicht gefunden.')
    }

    const attempt: ExamAttempt = {
      id: `attempt-${Date.now()}`,
      examId: payload.examId,
      startedAt: payload.startedAt,
      completedAt: payload.completedAt,
      prepNotes: payload.prepNotes,
      userAnswers: payload.userAnswers
    }

    insertAttempt(attempt)
    response.status(201).json(attempt)
  } catch (error) {
    next(error)
  }
})

if (existsSync(frontendDirectory)) {
  app.use(express.static(frontendDirectory))

  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api/')) {
      return next()
    }

    response.sendFile(join(frontendDirectory, 'index.html'))
    return undefined
  })
}

app.use((error: unknown, _request: express.Request, response: express.Response) => {
  if (error instanceof z.ZodError) {
    return response.status(400).json({
      message: 'Die Anfrage ist unvollständig oder fehlerhaft.',
      issues: error.issues
    })
  }

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({ message: error.message })
  }

  console.error(error)
  return response.status(500).json({
    message: 'Es ist ein unerwarteter Serverfehler aufgetreten.'
  })
})

app.listen(appConfig.port, () => {
  console.log(`Backend läuft auf Port ${appConfig.port}`)
})
