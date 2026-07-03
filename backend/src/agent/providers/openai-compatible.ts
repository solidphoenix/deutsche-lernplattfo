import { appConfig } from '../../config.js'
import { ApiError } from '../../errors.js'
import type { ChatMessage, EmbeddingProvider, GenerationProvider } from './types.js'

export class OpenAiCompatibleProvider implements GenerationProvider, EmbeddingProvider {
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly model: string
  private readonly embeddingBaseUrl: string
  private readonly embeddingModel: string
  private readonly embeddingApiKey?: string

  constructor() {
    this.baseUrl = appConfig.llmBaseUrl.replace(/\/$/, '')
    this.apiKey = appConfig.llmApiKey
    this.model = appConfig.llmModel
    this.embeddingBaseUrl = appConfig.embeddingBaseUrl.replace(/\/$/, '')
    this.embeddingModel = appConfig.embeddingModel
    this.embeddingApiKey = appConfig.embeddingApiKey
  }

  async generate(messages: ChatMessage[]) {
    if (!this.apiKey) {
      throw new ApiError(503, 'Der KI-Dienst ist nicht konfiguriert. Bitte hinterlegen Sie einen LLM_API_KEY.')
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `******
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        messages
      })
    })

    if (!response.ok) {
      const details = await response.text()
      throw new ApiError(502, `Der KI-Dienst ist nicht erreichbar. Bitte versuchen Sie es später erneut. (${details.slice(0, 200)})`)
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | null } }>
    }

    const content = payload.choices?.[0]?.message?.content
    if (!content) {
      throw new ApiError(502, 'Der KI-Dienst hat keine verwendbare Antwort geliefert.')
    }

    return content
  }

  async embed(text: string) {
    if (!this.embeddingApiKey) {
      throw new ApiError(503, 'Der Embedding-Dienst ist nicht konfiguriert. Bitte hinterlegen Sie einen EMBEDDING_API_KEY oder LLM_API_KEY.')
    }

    const response = await fetch(`${this.embeddingBaseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `******
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text
      })
    })

    if (!response.ok) {
      const details = await response.text()
      throw new ApiError(502, `Der Embedding-Dienst ist nicht erreichbar. (${details.slice(0, 200)})`)
    }

    const payload = await response.json() as {
      data?: Array<{ embedding?: number[] }>
    }

    const embedding = payload.data?.[0]?.embedding
    if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
      throw new ApiError(502, 'Der Embedding-Dienst hat keinen Vektor zurückgegeben.')
    }

    return embedding
  }
}
