import type { FallbackProps } from 'react-error-boundary'
import { Alert, AlertDescription, AlertTitle } from './components/ui/alert'
import { Button } from './components/ui/button'
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react'

export function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  if (import.meta.env.DEV) {
    throw error
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>Die Anwendung konnte nicht geladen werden.</AlertTitle>
          <AlertDescription>
            Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.
          </AlertDescription>
        </Alert>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Fehlerdetails</h3>
          <pre className="max-h-40 overflow-auto rounded border bg-muted/50 p-3 text-xs text-destructive">
            {error.message}
          </pre>
        </div>

        <Button onClick={resetErrorBoundary} className="w-full" variant="outline">
          <RefreshCwIcon className="mr-2 h-4 w-4" />
          Erneut versuchen
        </Button>
      </div>
    </div>
  )
}
