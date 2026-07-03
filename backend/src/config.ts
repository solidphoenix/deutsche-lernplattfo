import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import dotenv from 'dotenv'
import { z } from 'zod'

for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')]) {
  if (existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false })
  }
}

const backendRoot = process.cwd()
const repositoryRoot = resolve(backendRoot, '..')

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  PORT: z.coerce.number().int().positive().default(3001),
  APP_BASE_URL: z.string().url().default('http://localhost:3001'),
  FRONTEND_DIST_DIR: z.string().optional(),
  FALLBEISPIELE_DIR: z.string().optional(),
  KNOWLEDGE_DIR: z.string().optional(),
  DB_PATH: z.string().optional(),
  VECTOR_DB_PATH: z.string().optional(),
  ALLOWED_ORIGIN: z.string().optional(),
  LLM_PROVIDER: z.enum(['ollama', 'openai-compatible']).default('openai-compatible'),
  LLM_BASE_URL: z.string().default('https://api.openai.com/v1'),
  LLM_API_KEY: z.string().optional(),
  LLM_MODEL: z.string().default('gpt-4.1-mini'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.1:8b'),
  EMBEDDING_PROVIDER: z.enum(['ollama', 'openai-compatible']).default('ollama'),
  EMBEDDING_BASE_URL: z.string().optional(),
  EMBEDDING_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('nomic-embed-text')
})

const parsedEnv = envSchema.parse(process.env)

const dataRoot = resolve(backendRoot, 'data')
const defaultDbPath = resolve(dataRoot, 'sqlite', 'app.sqlite')
const defaultVectorDbPath = resolve(dataRoot, 'vector', 'knowledge.sqlite')

export const appConfig = {
  nodeEnv: parsedEnv.NODE_ENV ?? 'development',
  port: parsedEnv.PORT,
  appBaseUrl: parsedEnv.APP_BASE_URL,
  repositoryRoot,
  frontendDistDir: parsedEnv.FRONTEND_DIST_DIR ?? resolve(repositoryRoot, 'dist'),
  fallbeispieleDir: parsedEnv.FALLBEISPIELE_DIR ?? resolve(repositoryRoot, 'src', 'assets', 'documents'),
  knowledgeDir: parsedEnv.KNOWLEDGE_DIR ?? resolve(repositoryRoot, 'knowledge'),
  dbPath: parsedEnv.DB_PATH ?? defaultDbPath,
  vectorDbPath: parsedEnv.VECTOR_DB_PATH ?? defaultVectorDbPath,
  allowedOrigins: (parsedEnv.ALLOWED_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  llmProvider: parsedEnv.LLM_PROVIDER,
  llmBaseUrl: parsedEnv.LLM_BASE_URL,
  llmApiKey: parsedEnv.LLM_API_KEY,
  llmModel: parsedEnv.LLM_PROVIDER === 'ollama' ? parsedEnv.OLLAMA_MODEL : parsedEnv.LLM_MODEL,
  ollamaBaseUrl: parsedEnv.OLLAMA_BASE_URL,
  ollamaModel: parsedEnv.OLLAMA_MODEL,
  embeddingProvider: parsedEnv.EMBEDDING_PROVIDER,
  embeddingBaseUrl:
    parsedEnv.EMBEDDING_BASE_URL
    ?? (parsedEnv.EMBEDDING_PROVIDER === 'ollama' ? parsedEnv.OLLAMA_BASE_URL : parsedEnv.LLM_BASE_URL),
  embeddingApiKey: parsedEnv.EMBEDDING_API_KEY ?? parsedEnv.LLM_API_KEY,
  embeddingModel: parsedEnv.EMBEDDING_MODEL
} as const

for (const filePath of [appConfig.dbPath, appConfig.vectorDbPath]) {
  mkdirSync(dirname(filePath), { recursive: true })
}

mkdirSync(appConfig.knowledgeDir, { recursive: true })
