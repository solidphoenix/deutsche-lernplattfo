import { vectorDb } from '../db.js'

export interface KnowledgeChunkRow {
  id: string
  sourcePath: string
  sourceName: string
  mimeType: string
  chunkIndex: number
  content: string
  embedding: number[]
}

export function countKnowledgeChunks() {
  const row = vectorDb.prepare('SELECT COUNT(*) AS count FROM knowledge_chunks').get() as { count: number }
  return row.count
}

export function clearKnowledgeChunks() {
  vectorDb.prepare('DELETE FROM knowledge_chunks').run()
}

export function insertKnowledgeChunk(chunk: KnowledgeChunkRow) {
  vectorDb
    .prepare(
      `INSERT INTO knowledge_chunks (id, source_path, source_name, mime_type, chunk_index, content, embedding_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      chunk.id,
      chunk.sourcePath,
      chunk.sourceName,
      chunk.mimeType,
      chunk.chunkIndex,
      chunk.content,
      JSON.stringify(chunk.embedding),
      Date.now()
    )
}

export function listKnowledgeChunks(): KnowledgeChunkRow[] {
  const rows = vectorDb
    .prepare(
      `SELECT id, source_path, source_name, mime_type, chunk_index, content, embedding_json
       FROM knowledge_chunks`
    )
    .all() as Array<{
      id: string
      source_path: string
      source_name: string
      mime_type: string
      chunk_index: number
      content: string
      embedding_json: string
    }>

  return rows.map((row) => ({
    id: row.id,
    sourcePath: row.source_path,
    sourceName: row.source_name,
    mimeType: row.mime_type,
    chunkIndex: row.chunk_index,
    content: row.content,
    embedding: JSON.parse(row.embedding_json)
  }))
}
