import { appConfig } from '../../config.js'
import { ApiError } from '../../errors.js'
import type { ChatMessage, EmbeddingProvider, GenerationProvider } from './types.js'

export class OllamaProvider implements GenerationProvider, EmbeddingProvider {
  private readonly baseUrl = appConfig.ollamaBaseUrl.replace(/\/$/, '')
  private readonly chatModel = appConfig.ollamaModel
  private readonly embeddingBaseUrl = appConfig.embeddingBaseUrl.replace(/\/$/, '')
  private readonly embeddingModel = appConfig.embeddingModel

  async generate(messages: ChatMessage[]) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.chatModel,
        stream: false,
        messages,
        options: {
          temperature: 0.4
        }
      })
    })

    if (!response.ok) {
      const details = await response.text()
      throw new ApiError(502, `Der lokale Ollama-Dienst ist nicht erreichbar. (${details.slice(0, 200)})`)
    }

    const payload = await response.json() as {
      message?: { content?: string }
    }

    const content = payload.message?.content?.trim()
    if (!content) {
      throw new ApiError(502, 'Ollama hat keine verwendbare Antwort geliefert.')
    }

    return content
  }

  async embed(text: string) {
    const response = await fetch(`${this.embeddingBaseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: text
      })
    })

    if (!response.ok) {
      const details = await response.text()
      throw new ApiError(502, `Der lokale Embedding-Dienst ist nicht erreichbar. (${details.slice(0, 200)})`)
    }

    const payload = await response.json() as { embedding?: number[] }
    const embedding = payload.embedding
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new ApiError(502, 'Ollama hat keinen verwendbaren Embedding-Vektor geliefert.')
    }

    return embedding
  }
}
