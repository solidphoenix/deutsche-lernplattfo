export interface ChatMessage {
  role: 'system' | 'user'
  content: string
}

export interface GenerationProvider {
  generate(messages: ChatMessage[]): Promise<string>
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
}
