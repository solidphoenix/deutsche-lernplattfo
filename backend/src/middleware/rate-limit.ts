import type { NextFunction, Request, Response } from 'express'

interface RateLimitOptions {
  windowMs: number
  maxRequests: number
}

export function createRateLimitMiddleware({ windowMs, maxRequests }: RateLimitOptions) {
  const entries = new Map<string, { count: number; windowStart: number }>()

  return (request: Request, response: Response, next: NextFunction) => {
    const key = request.ip || request.headers['x-forwarded-for']?.toString() || 'unknown'
    const now = Date.now()
    const current = entries.get(key)

    if (!current || now - current.windowStart >= windowMs) {
      entries.set(key, { count: 1, windowStart: now })
      return next()
    }

    if (current.count >= maxRequests) {
      return response.status(429).json({
        message: 'Zu viele Anfragen in kurzer Zeit. Bitte versuchen Sie es gleich erneut.'
      })
    }

    current.count += 1
    entries.set(key, current)
    return next()
  }
}
