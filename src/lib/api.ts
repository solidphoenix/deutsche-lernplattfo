import type { CreateAttemptPayload, ExamAttempt, FallbeispielSummary, GeneratedExam } from './types'
import { staticFallbeispiele } from './fallbeispiele'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '')
const backendRequiredMessage =
  'Die Examen-Generierung benötigt ein laufendes Backend. Bitte starten Sie die App lokal mit Frontend und Backend.'

let isBackendUnavailable = false

class ApiClientError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {})
      }
    })
  } catch {
    throw new ApiClientError('Das Backend ist derzeit nicht erreichbar.')
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiClientError(errorPayload?.message ?? 'Die Anfrage an das Backend ist fehlgeschlagen.', response.status)
  }

  return response.json() as Promise<T>
}

function isBackendUnavailableError(error: unknown) {
  if (!(error instanceof ApiClientError)) {
    return false
  }

  return error.status === 404 || error.status === 405 || error.status === undefined
}

export const apiClient = {
  async listFallbeispiele() {
    try {
      const fallbeispiele = await request<FallbeispielSummary[]>('/fallbeispiele')
      isBackendUnavailable = false
      return fallbeispiele
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        isBackendUnavailable = true
        return staticFallbeispiele
      }
      throw error
    }
  },
  async listExams() {
    if (isBackendUnavailable) {
      return []
    }

    try {
      return await request<GeneratedExam[]>('/exams')
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        isBackendUnavailable = true
        return []
      }
      throw error
    }
  },
  getExam(id: string) {
    if (isBackendUnavailable) {
      throw new ApiClientError(backendRequiredMessage)
    }

    return request<GeneratedExam>(`/exams/${id}`)
  },
  generateExam(fallbeispielId: string) {
    if (isBackendUnavailable) {
      throw new ApiClientError(backendRequiredMessage)
    }

    return request<GeneratedExam>('/exams/generate', {
      method: 'POST',
      body: JSON.stringify({ fallbeispielId })
    })
  },
  async listAttempts() {
    if (isBackendUnavailable) {
      return []
    }

    try {
      return await request<ExamAttempt[]>('/attempts')
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        isBackendUnavailable = true
        return []
      }
      throw error
    }
  },
  createAttempt(payload: CreateAttemptPayload) {
    if (isBackendUnavailable) {
      throw new ApiClientError(backendRequiredMessage)
    }

    return request<ExamAttempt>('/attempts', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  },
  isExamGenerationAvailable() {
    return !isBackendUnavailable
  },
  getExamGenerationHint() {
    return backendRequiredMessage
  }
}
