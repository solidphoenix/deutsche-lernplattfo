import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChartLine,
  Clock,
  Exam,
  FilePdf,
  List,
  Notebook,
  Play,
  Sparkle,
  WarningCircle
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { StatisticsOverview } from '@/components/StatisticsOverview'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { apiClient } from '@/lib/api'
import { calculateExamScore, calculateProgressStats } from '@/lib/statistics'
import { examTopics } from '@/lib/topics'
import type { Difficulty, ExamAttempt, ExamPhase, FallbeispielSummary, GeneratedExam } from '@/lib/types'

const preparationDurationSeconds = 20 * 60
const examDurationSeconds = 30 * 60

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

function difficultyVariant(difficulty: Difficulty): 'default' | 'secondary' | 'destructive' {
  switch (difficulty) {
    case 'easy':
      return 'default'
    case 'medium':
      return 'secondary'
    default:
      return 'destructive'
  }
}

function difficultyLabel(difficulty: Difficulty) {
  switch (difficulty) {
    case 'easy':
      return 'Einfach'
    case 'medium':
      return 'Mittel'
    default:
      return 'Schwer'
  }
}

export default function App() {
  const [fallbeispiele, setFallbeispiele] = useState<FallbeispielSummary[]>([])
  const [generatedExams, setGeneratedExams] = useState<GeneratedExam[]>([])
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('fallbeispiele')
  const [isExamGenerationAvailable, setIsExamGenerationAvailable] = useState(true)
  const [generatingFallbeispielId, setGeneratingFallbeispielId] = useState<string | null>(null)
  const [currentExam, setCurrentExam] = useState<GeneratedExam | null>(null)
  const [examPhase, setExamPhase] = useState<ExamPhase>('prep')
  const [attemptStartedAt, setAttemptStartedAt] = useState<number | null>(null)
  const [prepNotes, setPrepNotes] = useState('')
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(preparationDurationSeconds)
  const [examTimeRemaining, setExamTimeRemaining] = useState(examDurationSeconds)
  const [prepTimerActive, setPrepTimerActive] = useState(false)
  const [examTimerActive, setExamTimerActive] = useState(false)
  const [isSavingAttempt, setIsSavingAttempt] = useState(false)

  const loadDashboardData = useCallback(async () => {
    const [fallbeispieleResponse, examsResponse, attemptsResponse] = await Promise.all([
      apiClient.listFallbeispiele(),
      apiClient.listExams(),
      apiClient.listAttempts()
    ])

    setFallbeispiele(fallbeispieleResponse)
    setGeneratedExams(examsResponse)
    setExamAttempts(attemptsResponse)
    setIsExamGenerationAvailable(apiClient.isExamGenerationAvailable())
  }, [])

  useEffect(() => {
    loadDashboardData()
      .catch((error: Error) => {
        toast.error(error.message || 'Das Backend konnte nicht geladen werden.')
      })
      .finally(() => setIsInitialLoading(false))
  }, [loadDashboardData])

  const resetExamFlow = useCallback(() => {
    setCurrentExam(null)
    setExamPhase('prep')
    setAttemptStartedAt(null)
    setPrepNotes('')
    setUserAnswers({})
    setCurrentQuestionIndex(0)
    setPrepTimeRemaining(preparationDurationSeconds)
    setExamTimeRemaining(examDurationSeconds)
    setPrepTimerActive(false)
    setExamTimerActive(false)
    setIsSavingAttempt(false)
  }, [])

  const startExamPreparation = useCallback(async (examId: string) => {
    try {
      const exam = await apiClient.getExam(examId)
      setCurrentExam(exam)
      setExamPhase('prep')
      setAttemptStartedAt(Date.now())
      setPrepNotes('')
      setUserAnswers({})
      setCurrentQuestionIndex(0)
      setPrepTimeRemaining(preparationDurationSeconds)
      setExamTimeRemaining(examDurationSeconds)
      setPrepTimerActive(true)
      setExamTimerActive(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Das Probeexamen konnte nicht geöffnet werden.'
      toast.error(message)
    }
  }, [])

  const handleBeginExamPhase = useCallback(() => {
    setPrepTimerActive(false)
    setExamTimerActive(true)
    setExamPhase('exam')
  }, [])

  const handleFinishExam = useCallback(async () => {
    if (!currentExam || !attemptStartedAt || isSavingAttempt) {
      return
    }

    setPrepTimerActive(false)
    setExamTimerActive(false)
    setIsSavingAttempt(true)

    try {
      const completedAttempt = await apiClient.createAttempt({
        examId: currentExam.id,
        startedAt: attemptStartedAt,
        completedAt: Date.now(),
        prepNotes,
        userAnswers
      })

      setExamAttempts((current) => [completedAttempt, ...current])
      setExamPhase('review')
      toast.success('Examen abgeschlossen! Ihre Antworten wurden gespeichert.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Der Versuch konnte nicht gespeichert werden.'
      toast.error(message)
    } finally {
      setIsSavingAttempt(false)
    }
  }, [attemptStartedAt, currentExam, isSavingAttempt, prepNotes, userAnswers])

  useEffect(() => {
    if (!prepTimerActive) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setPrepTimeRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          setPrepTimerActive(false)
          setExamPhase('exam')
          setExamTimerActive(true)
          toast.info('Die Vorbereitungszeit ist beendet. Das Examen startet jetzt.')
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [prepTimerActive])

  useEffect(() => {
    if (!examTimerActive) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setExamTimeRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval)
          setExamTimerActive(false)
          void handleFinishExam()
          return 0
        }

        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [examTimerActive, handleFinishExam])

  const currentQuestion = currentExam?.questions[currentQuestionIndex] ?? null
  const examScores = useMemo(() => {
    return examAttempts
      .filter((attempt) => attempt.completedAt)
      .map((attempt) => {
        const exam = generatedExams.find((entry) => entry.id === attempt.examId)
        if (!exam || !attempt.completedAt) {
          return null
        }

        const baseScore = calculateExamScore(exam.questions, attempt.userAnswers)
        return {
          ...baseScore,
          examId: exam.id,
          attemptId: attempt.id,
          pdfFileName: exam.pdfFileName,
          completedAt: attempt.completedAt,
          timeSpent: Math.max(0, Math.round((attempt.completedAt - attempt.startedAt) / 1000))
        }
      })
      .filter((score): score is NonNullable<typeof score> => score !== null)
  }, [examAttempts, generatedExams])

  const progressStats = useMemo(
    () => calculateProgressStats(generatedExams, examAttempts),
    [examAttempts, generatedExams]
  )

  const generateExam = useCallback(async (fallbeispiel: FallbeispielSummary) => {
    if (!isExamGenerationAvailable) {
      toast.info(apiClient.getExamGenerationHint())
      return
    }

    setGeneratingFallbeispielId(fallbeispiel.id)
    const toastId = toast.loading(`Generiere Probeexamen für „${fallbeispiel.displayName}“...`)

    try {
      const exam = await apiClient.generateExam(fallbeispiel.id)
      setGeneratedExams((current) => [exam, ...current])
      setActiveTab('exams')
      toast.success('Das Probeexamen wurde erfolgreich erstellt.', { id: toastId })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Die Generierung ist fehlgeschlagen.'
      toast.error(message, { id: toastId })
    } finally {
      setGeneratingFallbeispielId(null)
    }
  }, [isExamGenerationAvailable])

  if (currentExam && examPhase === 'prep') {
    return (
      <div className="min-h-screen bg-background px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button variant="ghost" className="mb-2 gap-2 px-0" onClick={resetExamFlow}>
                <ArrowLeft size={16} /> Zurück zur Übersicht
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">Vorbereitungsphase</h1>
              <p className="text-muted-foreground">{currentExam.pdfFileName}</p>
            </div>
            <Card className="w-full max-w-sm bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Verbleibende Zeit</p>
                  <p className="text-3xl font-bold text-primary">{formatTime(prepTimeRemaining)}</p>
                </div>
                <Clock size={28} className="text-primary" />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Alle 9 Prüfungsfragen</CardTitle>
                <CardDescription>
                  Lesen Sie die Fragen in Ruhe durch und notieren Sie Ihre Gedanken für das mündliche Probeexamen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentExam.questions.map((question, index) => (
                    <div key={question.id} className="rounded-lg border p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="font-medium">Frage {index + 1}</p>
                        <Badge variant={difficultyVariant(question.difficulty)}>
                          {difficultyLabel(question.difficulty)}
                        </Badge>
                      </div>
                      <p className="text-sm leading-6 text-foreground/90">{question.question}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Notebook size={20} /> Vorbereitungsnotizen
                </CardTitle>
                <CardDescription>
                  Diese Notizen bleiben während des Examens sichtbar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={prepNotes}
                  onChange={(event) => setPrepNotes(event.target.value)}
                  className="min-h-[360px]"
                  placeholder="Wichtige Beobachtungen, Pflegeprobleme, Maßnahmen, Kommunikation, Risiken ..."
                />
                <Button onClick={handleBeginExamPhase} className="w-full gap-2">
                  <Play size={18} /> Examen starten
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (currentExam && examPhase === 'exam' && currentQuestion) {
    const progress = ((currentQuestionIndex + 1) / currentExam.questions.length) * 100

    return (
      <div className="min-h-screen bg-background px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Button variant="ghost" className="mb-2 gap-2 px-0" onClick={resetExamFlow}>
                <ArrowLeft size={16} /> Examen verlassen
              </Button>
              <h1 className="text-3xl font-bold tracking-tight">Mündliches Probeexamen</h1>
              <p className="text-muted-foreground">{currentExam.pdfFileName}</p>
            </div>
            <Card className="w-full max-w-sm bg-gradient-to-br from-accent/10 to-accent/5">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Verbleibende Zeit</p>
                  <p className="text-3xl font-bold text-accent-foreground">{formatTime(examTimeRemaining)}</p>
                </div>
                <Clock size={28} className="text-accent-foreground" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fortschritt</p>
                  <h2 className="text-xl font-semibold">
                    Frage {currentQuestionIndex + 1} von {currentExam.questions.length}
                  </h2>
                </div>
                <Badge variant={difficultyVariant(currentQuestion.difficulty)}>
                  {difficultyLabel(currentQuestion.difficulty)}
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-lg leading-7">{currentQuestion.question}</p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Ihre Antwort</CardTitle>
                <CardDescription>
                  Formulieren Sie Ihre mündliche Antwort so konkret wie möglich.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={userAnswers[currentQuestion.id] ?? ''}
                  onChange={(event) =>
                    setUserAnswers((current) => ({
                      ...current,
                      [currentQuestion.id]: event.target.value
                    }))
                  }
                  className="min-h-[320px]"
                  placeholder="Ihre Antwort auf diese Prüfungsfrage ..."
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex((current) => Math.max(0, current - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="gap-2"
                  >
                    <ArrowLeft size={16} /> Vorherige Frage
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex((current) => Math.min(currentExam.questions.length - 1, current + 1))}
                      disabled={currentQuestionIndex >= currentExam.questions.length - 1}
                      className="gap-2"
                    >
                      Nächste Frage <ArrowRight size={16} />
                    </Button>
                    <Button onClick={() => void handleFinishExam()} disabled={isSavingAttempt}>
                      {isSavingAttempt ? 'Speichern ...' : 'Examen beenden'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Notebook size={20} /> Ihre Vorbereitungsnotizen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[420px] rounded-md border bg-muted/20 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {prepNotes.trim() || 'Keine Notizen vorhanden.'}
                  </p>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (currentExam && examPhase === 'review') {
    return (
      <div className="min-h-screen bg-background px-4 py-6 md:px-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Review & Musterantworten</h1>
              <p className="text-muted-foreground">{currentExam.pdfFileName}</p>
            </div>
            <Button onClick={resetExamFlow} className="gap-2">
              Zur Übersicht zurück <ArrowRight size={16} />
            </Button>
          </div>

          <div className="space-y-4">
            {currentExam.questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle className="text-lg">Frage {index + 1}</CardTitle>
                      <CardDescription className="mt-1 text-base text-foreground/80">
                        {question.question}
                      </CardDescription>
                    </div>
                    <Badge variant={difficultyVariant(question.difficulty)}>
                      {difficultyLabel(question.difficulty)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Ihre Antwort</h3>
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {userAnswers[question.id]?.trim() || 'Keine Antwort eingegeben.'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <h3 className="mb-2 text-sm font-semibold text-primary">Musterantwort</h3>
                    <p className="whitespace-pre-wrap text-sm leading-6">{question.suggestedAnswer}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <Badge variant="outline" className="gap-2 px-3 py-1 text-sm">
            <Sparkle size={14} /> Prüfungs-Agent für Pflegefachassistenz
          </Badge>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Deutsche Lernplattform</h1>
            <p className="mt-2 max-w-3xl text-lg text-muted-foreground">
              Wählen Sie ein Fallbeispiel aus, lassen Sie ein Probeexamen mit genau 9 Fragen erzeugen und trainieren Sie Vorbereitung, Prüfung und Review in einem Ablauf.
            </p>
          </div>
        </motion.div>

        {isInitialLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Lade Lernsituationen, Probeexamen und Statistiken ...
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-3xl grid-cols-4">
              <TabsTrigger value="fallbeispiele" className="gap-2">
                <FilePdf size={16} /> Lernsituationen
              </TabsTrigger>
              <TabsTrigger value="exams" className="gap-2">
                <Exam size={16} /> Probeexamen
              </TabsTrigger>
              <TabsTrigger value="topics" className="gap-2">
                <List size={16} /> Themen
              </TabsTrigger>
              <TabsTrigger value="statistics" className="gap-2">
                <ChartLine size={16} /> Statistiken
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fallbeispiele" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Verfügbare Fallbeispiele</CardTitle>
                  <CardDescription>
                    {isExamGenerationAvailable
                      ? 'Die Server-Seite extrahiert den Text aus der PDF und erstellt daraus ein mündliches Probeexamen.'
                      : 'Die Fallbeispiele sind sichtbar. Für „Probeexamen generieren“ benötigen Sie ein laufendes Backend (lokaler Vollbetrieb).'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {fallbeispiele.map((fallbeispiel) => (
                    <Card key={fallbeispiel.id} className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-lg">{fallbeispiel.displayName}</CardTitle>
                        <CardDescription>
                          9 Fragen · 20 Minuten Vorbereitung · 30 Minuten Examen
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          className="w-full gap-2"
                          onClick={() => void generateExam(fallbeispiel)}
                          disabled={!isExamGenerationAvailable || generatingFallbeispielId === fallbeispiel.id}
                        >
                          <Sparkle size={18} />
                          {!isExamGenerationAvailable
                            ? 'Backend erforderlich'
                            : generatingFallbeispielId === fallbeispiel.id
                              ? 'Generierung läuft ...'
                              : 'Probeexamen generieren'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="exams" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Generierte Probeexamen</CardTitle>
                  <CardDescription>
                    Jedes Examen enthält genau 3 leichte, 3 mittlere und 3 schwere Fragen.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedExams.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                      Noch keine Probeexamen vorhanden. Generieren Sie zuerst ein Examen aus einer Lernsituation.
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {generatedExams.map((exam) => (
                        <Card key={exam.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{exam.pdfFileName}</CardTitle>
                            <CardDescription>
                              Erstellt am {new Date(exam.createdAt).toLocaleString('de-DE')}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="default">3 leicht</Badge>
                              <Badge variant="secondary">3 mittel</Badge>
                              <Badge variant="destructive">3 schwer</Badge>
                            </div>
                            <Button className="w-full gap-2" onClick={() => void startExamPreparation(exam.id)}>
                              <Play size={18} /> Examen starten
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="topics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Themen für die mündliche Prüfung</CardTitle>
                  <CardDescription>
                    Die 29 Themen aus der Ausbildung dienen als Taxonomie für den Prüfungs-Agenten und die Statistik.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  {examTopics.map((topic) => (
                    <Card key={topic.id}>
                      <CardHeader>
                        <CardTitle className="text-base">#{topic.id} · {topic.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {topic.instructors.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {topic.instructors.map((instructor) => (
                              <Badge key={instructor} variant="outline">{instructor}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Keine Lehrkraft hinterlegt.</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statistics" className="space-y-6">
              {examScores.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
                    <WarningCircle size={28} />
                    <div>
                      <p className="font-medium text-foreground">Noch keine Statistik verfügbar</p>
                      <p className="text-sm">Schließen Sie mindestens ein Probeexamen ab, damit Fortschritt und Themenbeherrschung berechnet werden können.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <StatisticsOverview stats={progressStats} examScores={examScores} />
              )}
            </TabsContent>
          </Tabs>
        )}

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 text-sm text-primary/90 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <BookOpen size={18} className="mt-0.5 shrink-0" />
              <p>
                Die Fragen werden KI-gestützt aus dem gewählten Fallbeispiel und optional indexierten Lernunterlagen erzeugt. Bitte lassen Sie die Ergebnisse bei Bedarf von einer Lehrkraft prüfen.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
