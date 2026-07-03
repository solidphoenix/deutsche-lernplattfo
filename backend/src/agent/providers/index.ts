import { appConfig } from '../../config.js'
import { OllamaProvider } from './ollama.js'
import { OpenAiCompatibleProvider } from './openai-compatible.js'

export function getGenerationProvider() {
  return appConfig.llmProvider === 'ollama'
    ? new OllamaProvider()
    : new OpenAiCompatibleProvider()
}

export function getEmbeddingProvider() {
  return appConfig.embeddingProvider === 'ollama'
    ? new OllamaProvider()
    : new OpenAiCompatibleProvider()
}
