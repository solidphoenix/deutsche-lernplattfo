import type { CreateAttemptPayload, ExamAttempt, FallbeispielSummary, GeneratedExam } from './types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')

class ApiClientError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  })

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiClientError(errorPayload?.message ?? 'Die Anfrage an das Backend ist fehlgeschlagen.')
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  listFallbeispiele() {
    return request<FallbeispielSummary[]>('/fallbeispiele')
  },
  listExams() {
    return request<GeneratedExam[]>('/exams')
  },
  getExam(id: string) {
    return request<GeneratedExam>(`/exams/${id}`)
  },
  generateExam(fallbeispielId: string) {
    return request<GeneratedExam>('/exams/generate', {
      method: 'POST',
      body: JSON.stringify({ fallbeispielId })
    })
  },
  listAttempts() {
    return request<ExamAttempt[]>('/attempts')
  },
  createAttempt(payload: CreateAttemptPayload) {
    return request<ExamAttempt>('/attempts', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }
}
