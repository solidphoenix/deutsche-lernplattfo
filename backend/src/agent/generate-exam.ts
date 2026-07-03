import { getGenerationProvider } from './providers/index.js'
import { retrieveKnowledgeContext } from './rag.js'
import { topicDefinitions, validTopicIds } from '../data/topics.js'
import type { FallbeispielDefinition } from '../data/fallbeispiele.js'
import { ApiError } from '../errors.js'
import type { Difficulty, GeneratedExam, Question } from '../types.js'

const difficultyOrder: Difficulty[] = ['easy', 'medium', 'hard']
const difficultyLabels: Record<Difficulty, string> = {
  easy: 'leicht',
  medium: 'mittel',
  hard: 'schwer'
}

function sentenceSplit(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function normalizeDifficulty(value: unknown): Difficulty | null {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (['leicht', 'einfach', 'easy'].includes(normalized)) return 'easy'
  if (['mittel', 'medium', 'moderat'].includes(normalized)) return 'medium'
  if (['schwer', 'hard', 'anspruchsvoll'].includes(normalized)) return 'hard'
  return null
}

function pickRelevantTopics(text: string) {
  const normalizedText = text.toLowerCase()
  const scoredTopics = topicDefinitions
    .map((topic) => {
      const tokens = topic.title
        .toLowerCase()
        .split(/[^a-zäöüß0-9]+/i)
        .filter((token) => token.length >= 4)

      const score = tokens.reduce((sum, token) => sum + (normalizedText.includes(token) ? 1 : 0), 0)
      return { topic, score }
    })
    .sort((left, right) => right.score - left.score || left.topic.id - right.topic.id)

  const matching = scoredTopics.filter((entry) => entry.score > 0).slice(0, 6).map((entry) => entry.topic)
  return matching.length > 0 ? matching : topicDefinitions.slice(0, 6)
}

function extractJsonPayload(raw: string) {
  const trimmed = raw.trim()
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i)
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim()
  }

  const objectStart = trimmed.indexOf('{')
  const objectEnd = trimmed.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1)
  }

  const arrayStart = trimmed.indexOf('[')
  const arrayEnd = trimmed.lastIndexOf(']')
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1)
  }

  return trimmed
}

function parseModelResponse(raw: string) {
  const payload = extractJsonPayload(raw)
  const parsed = JSON.parse(payload) as unknown
  if (Array.isArray(parsed)) {
    return parsed
  }

  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>
    if (Array.isArray(record.questions)) {
      return record.questions
    }
  }

  return []
}

function ensureSuggestedAnswer(text: string, topicTitle: string) {
  const sentences = sentenceSplit(text)
  const completed = [...sentences]

  while (completed.length < 3) {
    completed.push(`Begründen Sie die Maßnahme fachlich mit dem Thema ${topicTitle}.`)
  }

  return completed.slice(0, 5).join(' ')
}

function normalizeQuestion(candidate: unknown, index: number, fallbackTopicIds: number[]): Question | null {
  if (!candidate || typeof candidate !== 'object') {
    return null
  }

  const record = candidate as Record<string, unknown>
  const question = typeof record.question === 'string'
    ? record.question.trim()
    : typeof record.frage === 'string'
      ? record.frage.trim()
      : ''
  const suggestedAnswer = typeof record.suggestedAnswer === 'string'
    ? record.suggestedAnswer.trim()
    : typeof record.musterantwort === 'string'
      ? record.musterantwort.trim()
      : ''
  const difficulty = normalizeDifficulty(record.difficulty)

  const relatedTopics = Array.isArray(record.relatedTopics)
    ? record.relatedTopics
        .map((topic) => Number(topic))
        .filter((topicId) => Number.isInteger(topicId) && validTopicIds.has(topicId))
    : []

  if (!question || !suggestedAnswer || !difficulty) {
    return null
  }

  const topicId = relatedTopics[0] ?? fallbackTopicIds[index % fallbackTopicIds.length] ?? 1
  const topicTitle = topicDefinitions.find((topic) => topic.id === topicId)?.title ?? `Thema ${topicId}`

  return {
    id: `question-${index + 1}`,
    question,
    suggestedAnswer: ensureSuggestedAnswer(suggestedAnswer, topicTitle),
    difficulty,
    relatedTopics: relatedTopics.length > 0 ? relatedTopics.slice(0, 4) : [topicId]
  }
}

function createFallbackQuestion(
  difficulty: Difficulty,
  index: number,
  fallbeispiel: FallbeispielDefinition,
  excerpt: string,
  topicIds: number[]
): Question {
  const topicId = topicIds[index % topicIds.length] ?? 1
  const topicTitle = topicDefinitions.find((topic) => topic.id === topicId)?.title ?? `Thema ${topicId}`
  const excerptLead = sentenceSplit(excerpt)[0] ?? fallbeispiel.displayName

  const templates: Record<Difficulty, string> = {
    easy: `Beschreiben Sie im Fallbeispiel \"${fallbeispiel.displayName}\", welche ersten pflegerischen Beobachtungen zum Thema \"${topicTitle}\" wichtig sind.`,
    medium: `Erläutern Sie im Fallbeispiel \"${fallbeispiel.displayName}\", wie Sie das Thema \"${topicTitle}\" fachgerecht planen, durchführen und dokumentieren würden.`,
    hard: `Begründen Sie im Fallbeispiel \"${fallbeispiel.displayName}\", welche Prioritäten, Risiken und Grenzen der Pflegefachassistenz beim Thema \"${topicTitle}\" zu beachten sind.`
  }

  const answerTemplates: Record<Difficulty, string[]> = {
    easy: [
      `Im Fallbeispiel steht zunächst eine strukturierte Beobachtung der Situation im Vordergrund: ${excerptLead}.`,
      `Pflegefachassistent:innen erfassen passende Anzeichen zum Thema ${topicTitle} und leiten daraus erste sichere Maßnahmen ab.`,
      'Auffälligkeiten werden zeitnah dokumentiert und an die zuständige Pflegefachperson weitergegeben.'
    ],
    medium: [
      `Im Fallbeispiel muss das Vorgehen zum Thema ${topicTitle} geplant, sicher durchgeführt und nachvollziehbar dokumentiert werden.`,
      'Dabei werden Ressourcen, Risiken und die aktuelle Pflegesituation der betroffenen Person einbezogen.',
      'Wichtige Beobachtungen und durchgeführte Maßnahmen werden fachlich korrekt weitergegeben.',
      'Bei Veränderungen wird frühzeitig Rücksprache mit der zuständigen Pflegefachperson gehalten.'
    ],
    hard: [
      `Im Fallbeispiel verlangt das Thema ${topicTitle} eine klare Prioritätensetzung innerhalb des Kompetenzbereichs der Pflegefachassistenz.`,
      'Pflegefachassistent:innen müssen Risiken erkennen, Grenzen der eigenen Verantwortung beachten und Maßnahmen fachlich begründen können.',
      'Komplexe Auffälligkeiten oder Gefährdungen erfordern die Einbindung weiterer Berufsgruppen beziehungsweise einer diplomierten Pflegefachperson.',
      'Dokumentation, Kommunikation und rechtssicheres Handeln sind dabei genauso wichtig wie die direkte pflegerische Unterstützung.'
    ]
  }

  return {
    id: `question-${difficulty}-${index + 1}`,
    question: templates[difficulty],
    suggestedAnswer: answerTemplates[difficulty].join(' '),
    difficulty,
    relatedTopics: [topicId]
  }
}

function enforceQuestionContract(
  normalizedQuestions: Question[],
  fallbeispiel: FallbeispielDefinition,
  excerpt: string,
  topicIds: number[]
) {
  const uniqueQuestions = normalizedQuestions.filter((question, index, questions) => {
    const normalizedPrompt = question.question.toLowerCase()
    return questions.findIndex((entry) => entry.question.toLowerCase() === normalizedPrompt) === index
  })

  const grouped = new Map<Difficulty, Question[]>(difficultyOrder.map((difficulty) => [difficulty, []]))
  for (const question of uniqueQuestions) {
    grouped.get(question.difficulty)?.push(question)
  }

  const finalQuestions: Question[] = []

  difficultyOrder.forEach((difficulty) => {
    const bucket = grouped.get(difficulty) ?? []
    const selected = bucket.slice(0, 3)
    while (selected.length < 3) {
      selected.push(createFallbackQuestion(difficulty, selected.length, fallbeispiel, excerpt, topicIds))
    }

    selected.forEach((question, index) => {
      finalQuestions.push({
        ...question,
        id: `question-${difficulty}-${index + 1}`,
        difficulty
      })
    })
  })

  return finalQuestions
}

function buildPrompt(
  fallbeispiel: FallbeispielDefinition,
  excerpt: string,
  relevantTopicIds: number[],
  retrievedContext: Array<{ sourceName: string; content: string }>
) {
  const topics = topicDefinitions
    .map((topic) => `${topic.id}. ${topic.title}`)
    .join('\n')
  const focusTopics = relevantTopicIds.join(', ')
  const knowledgeSection = retrievedContext.length > 0
    ? retrievedContext
        .map((chunk, index) => `Quelle ${index + 1} (${chunk.sourceName}):\n${chunk.content}`)
        .join('\n\n')
    : 'Keine zusätzliche Wissensbasis indexiert. Verwende nur das Fallbeispiel und die Themenliste.'

  return `Erstelle ein mündliches Probeexamen für die Pflegefachassistenz.

Fallbeispiel: ${fallbeispiel.displayName}
Relevante Themen-IDs als Orientierung: ${focusTopics}

Themenliste:
${topics}

Auszug aus dem Fallbeispiel:
"""
${excerpt}
"""

Wissensbasis aus den Lernunterlagen:
"""
${knowledgeSection}
"""

Gib ausschließlich JSON zurück.
Format:
{
  "questions": [
    {
      "question": "...",
      "suggestedAnswer": "3 bis 5 deutsche Sätze",
      "difficulty": "easy | medium | hard",
      "relatedTopics": [1, 2]
    }
  ]
}

Regeln:
- Genau 9 Fragen
- Genau 3 easy, 3 medium, 3 hard
- Jede Frage muss sich fachlich auf das Fallbeispiel beziehen
- Die Fragen sollen realistisch für eine mündliche Prüfung sein
- relatedTopics darf nur IDs aus der Themenliste enthalten
- suggestedAnswer muss eine fachlich brauchbare Musterantwort in deutscher Sprache sein`
}

export async function generateExam(
  fallbeispiel: FallbeispielDefinition,
  excerpt: string
): Promise<GeneratedExam> {
  const relevantTopics = pickRelevantTopics(`${fallbeispiel.displayName}\n${excerpt}`)
  const relevantTopicIds = relevantTopics.map((topic) => topic.id)
  const retrievedContext = await retrieveKnowledgeContext(`${fallbeispiel.displayName}\n${excerpt.slice(0, 4000)}`)
  const prompt = buildPrompt(fallbeispiel, excerpt, relevantTopicIds, retrievedContext)
  const provider = getGenerationProvider()

  const messages = [
    {
      role: 'system' as const,
      content:
        'Du bist ein spezialisierter Prüfungs-Agent für die Pflegefachassistenz. Du handelst wie ein realistischer Prüfer, formulierst präzise mündliche Prüfungsfragen und hältst dich streng an das gewünschte JSON-Format.'
    },
    {
      role: 'user' as const,
      content: prompt
    }
  ]

  let normalizedQuestions: Question[] = []
  let lastError: unknown = null

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await provider.generate(messages)
      const parsedQuestions = parseModelResponse(raw)
      normalizedQuestions = parsedQuestions
        .map((question, index) => normalizeQuestion(question, index, relevantTopicIds))
        .filter((question): question is Question => question !== null)

      if (normalizedQuestions.length > 0) {
        break
      }
    } catch (error) {
      lastError = error
    }

    messages.push({
      role: 'user',
      content: 'Die letzte Antwort war ungültig. Gib ausschließlich gültiges JSON mit genau 9 Fragen und den Feldern question, suggestedAnswer, difficulty und relatedTopics zurück.'
    })
  }

  if (normalizedQuestions.length === 0) {
    if (lastError instanceof ApiError) {
      throw lastError
    }

    throw new ApiError(502, 'Die KI-Antwort konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.')
  }

  const finalQuestions = enforceQuestionContract(normalizedQuestions, fallbeispiel, excerpt, relevantTopicIds)
  if (finalQuestions.length !== 9) {
    throw new ApiError(502, 'Das Probeexamen konnte nicht zuverlässig erstellt werden.')
  }

  return {
    id: `exam-${Date.now()}`,
    fallbeispielId: fallbeispiel.id,
    pdfFileName: fallbeispiel.displayName,
    createdAt: Date.now(),
    questions: finalQuestions
  }
}
