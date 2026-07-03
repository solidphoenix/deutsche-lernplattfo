import Database from 'better-sqlite3'
import { dirname } from 'node:path'
import { mkdirSync } from 'node:fs'
import { appConfig } from './config.js'

function ensureParentDirectory(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true })
}

ensureParentDirectory(appConfig.dbPath)
ensureParentDirectory(appConfig.vectorDbPath)

const appDb = new Database(appConfig.dbPath)
const vectorDb = new Database(appConfig.vectorDbPath)

appDb.pragma('journal_mode = WAL')
vectorDb.pragma('journal_mode = WAL')

appDb.exec(`
  CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    fallbeispiel_id TEXT NOT NULL,
    pdf_file_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    questions_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    prep_notes TEXT NOT NULL,
    user_answers_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (exam_id) REFERENCES exams(id)
  );
`)

vectorDb.exec(`
  CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id TEXT PRIMARY KEY,
    source_path TEXT NOT NULL,
    source_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source_path
    ON knowledge_chunks(source_path);
`)

export { appDb, vectorDb }
