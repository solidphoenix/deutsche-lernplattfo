import { readdir, readFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { appConfig } from '../config.js'
import { getEmbeddingProvider } from './providers/index.js'
import { clearKnowledgeChunks, countKnowledgeChunks, insertKnowledgeChunk, listKnowledgeChunks } from '../repositories/knowledge.js'
import { extractTextFromPdf } from '../services/pdf.js'

const supportedExtensions = new Set(['.pdf', '.md', '.txt'])
const chunkSize = 1400
const chunkOverlap = 250

interface RetrievedChunk {
  id: string
  sourceName: string
  content: string
  score: number
}

function normalizeText(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function chunkText(text: string) {
  const normalized = normalizeText(text)
  if (!normalized) {
    return []
  }

  const chunks: string[] = []
  let cursor = 0

  while (cursor < normalized.length) {
    const slice = normalized.slice(cursor, cursor + chunkSize)
    chunks.push(slice.trim())
    cursor += Math.max(1, chunkSize - chunkOverlap)
  }

  return chunks.filter(Boolean)
}

async function listKnowledgeFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      return listKnowledgeFiles(fullPath)
    }

    if (!entry.isFile()) {
      return []
    }

    const extension = extname(entry.name).toLowerCase()
    if (!supportedExtensions.has(extension) || entry.name.toLowerCase() === 'readme.md') {
      return []
    }

    return [fullPath]
  }))

  return files.flat()
}

async function readKnowledgeText(filePath: string) {
  const extension = extname(filePath).toLowerCase()
  if (extension === '.pdf') {
    return extractTextFromPdf(filePath)
  }

  return readFile(filePath, 'utf8')
}

function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length)
  let dotProduct = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0
    const rightValue = right[index] ?? 0
    dotProduct += leftValue * rightValue
    leftNorm += leftValue * leftValue
    rightNorm += rightValue * rightValue
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

export async function rebuildKnowledgeIndex() {
  const files = await listKnowledgeFiles(appConfig.knowledgeDir)
  clearKnowledgeChunks()

  if (files.length === 0) {
    return {
      indexedFiles: 0,
      indexedChunks: 0,
      warning: 'Im Ordner /knowledge wurden keine indexierbaren Lernunterlagen gefunden.'
    }
  }

  const embeddingProvider = getEmbeddingProvider()
  let indexedChunks = 0

  for (const filePath of files) {
    const rawText = await readKnowledgeText(filePath)
    const chunks = chunkText(rawText)
    const sourceName = basename(filePath)

    for (let index = 0; index < chunks.length; index += 1) {
      const content = chunks[index]
      if (!content) {
        continue
      }

      const embedding = await embeddingProvider.embed(content)
      insertKnowledgeChunk({
        id: `${sourceName}-${index}`,
        sourcePath: filePath,
        sourceName,
        mimeType: extname(filePath).toLowerCase().slice(1),
        chunkIndex: index,
        content,
        embedding
      })
      indexedChunks += 1
    }
  }

  return {
    indexedFiles: files.length,
    indexedChunks,
    warning: undefined
  }
}

export async function retrieveKnowledgeContext(query: string, limit = 6): Promise<RetrievedChunk[]> {
  if (countKnowledgeChunks() === 0) {
    console.warn('[RAG] Es sind keine indexierten Lernunterlagen vorhanden. Es wird nur das Fallbeispiel verwendet.')
    return []
  }

  try {
    const embeddingProvider = getEmbeddingProvider()
    const queryEmbedding = await embeddingProvider.embed(query)
    const rows = listKnowledgeChunks()

    return rows
      .map((row) => ({
        id: row.id,
        sourceName: row.sourceName,
        content: row.content,
        score: cosineSimilarity(queryEmbedding, row.embedding)
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
  } catch (error) {
    console.warn('[RAG] Wissensabruf fehlgeschlagen. Es wird ohne zusätzliche Lernunterlagen weitergemacht.', error)
    return []
  }
}
