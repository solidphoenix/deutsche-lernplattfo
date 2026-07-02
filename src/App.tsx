import { useState, useEffect, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Sparkle, 
  Exam,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Clock,
  Notebook,
  FilePdf,
  List,
  Play,
  ChartLine
} from '@phosphor-icons/react'
import { availablePDFs } from '@/lib/pdf-loader'
import { examTopics } from '@/lib/topics'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { StatisticsOverview } from '@/components/StatisticsOverview'
import { 
  calculateProgressStats, 
  calculateExamScore,
  type ExamScore 
} from '@/lib/statistics'

interface Question {
  id: string
  question: string
  suggestedAnswer: string
  difficulty: 'easy' | 'medium' | 'hard'
  relatedTopics: number[]
}

interface Exam {
  id: string
  pdfFileName: string
  createdAt: number
  questions: Question[]
}

interface ExamAttempt {
  id: string
  examId: string
  startedAt: number
  completedAt?: number
  prepNotes: string
  userAnswers: Record<string, string>
}

type ExamPhase = 'prep' | 'exam' | 'review'

const validDifficulties = ['easy', 'medium', 'hard'] as const

function extractJsonPayload(response: string) {
  const trimmed = response.trim()
  const fencedJson = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)

  if (fencedJson?.[1]) {
    return fencedJson[1].trim()
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1)
  }

  return trimmed
}

function parseExamResponse(response: unknown) {
  if (!response) {
    throw new Error('Die KI hat keine Antwort zurückgegeben.')
  }

  if (typeof response !== 'string') {
    return response
  }

  try {
    return JSON.parse(extractJsonPayload(response))
  } catch {
    throw new Error('Die KI-Antwort konnte nicht als JSON gelesen werden.')
  }
}

function normalizeExamQuestion(question: any, index: number): Question {
  const questionText = typeof question?.question === 'string' ? question.question.trim() : ''
  const suggestedAnswer = typeof question?.suggestedAnswer === 'string' ? question.suggestedAnswer.trim() : ''
  const difficulty = validDifficulties.includes(question?.difficulty) ? question.difficulty : 'medium'
  const relatedTopics = Array.isArray(question?.relatedTopics)
    ? question.relatedTopics.filter((topic: unknown): topic is number => Number.isInteger(topic))
    : []

  if (!questionText || !suggestedAnswer) {
    throw new Error(`Frage ${index + 1} ist unvollständig.`)
  }

  return {
    id: `q-${index}-${Date.now()}`,
    question: questionText,
    suggestedAnswer,
    difficulty,
    relatedTopics
  }
}

function App() {
  const [generatedExams, setGeneratedExams] = useKV<Exam[]>('generated-exams', [])
  const [examAttempts, setExamAttempts] = useKV<ExamAttempt[]>('exam-attempts', [])
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedPdfForGeneration, setSelectedPdfForGeneration] = useState<string | null>(null)
  const [currentExam, setCurrentExam] = useState<Exam | null>(null)
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttempt | null>(null)
  const [examPhase, setExamPhase] = useState<ExamPhase>('prep')
  const [prepNotes, setPrepNotes] = useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(20 * 60)
  const [examTimeRemaining, setExamTimeRemaining] = useState(30 * 60)
  const [prepTimerActive, setPrepTimerActive] = useState(false)
  const [examTimerActive, setExamTimerActive] = useState(false)
  const [examStartTime, setExamStartTime] = useState<number>(0)

  const progressStats = useMemo(() => {
    return calculateProgressStats(generatedExams || [], examAttempts || [])
  }, [generatedExams, examAttempts])

  const examScores = useMemo(() => {
    const completedAttempts = (examAttempts || []).filter(a => a.completedAt)
    return completedAttempts.map(attempt => {
      const exam = (generatedExams || []).find(e => e.id === attempt.examId)
      if (!exam) return null

      const baseScore = calculateExamScore(exam.questions, attempt.userAnswers)
      const timeSpent = attempt.completedAt && attempt.startedAt 
        ? Math.floor((attempt.completedAt - attempt.startedAt) / 1000)
        : 0

      return {
        ...baseScore,
        examId: exam.id,
        attemptId: attempt.id,
        pdfFileName: exam.pdfFileName,
        completedAt: attempt.completedAt || 0,
        timeSpent
      }
    }).filter((score): score is ExamScore => score !== null)
      .sort((a, b) => b.completedAt - a.completedAt)
  }, [generatedExams, examAttempts])

  useEffect(() => {
    if (prepTimerActive) {
      const interval = window.setInterval(() => {
        setPrepTimeRemaining(prev => {
          if (prev <= 1) {
            setPrepTimerActive(false)
            toast.info('Vorbereitungszeit ist um! Das Examen beginnt jetzt.')
            handleStartExamPhase()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [prepTimerActive])

  useEffect(() => {
    if (examTimerActive) {
      const interval = window.setInterval(() => {
        setExamTimeRemaining(prev => {
          if (prev <= 1) {
            setExamTimerActive(false)
            handleFinishExam()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [examTimerActive])

  const generateExamFromPDF = async (pdfId: string) => {
    const pdf = availablePDFs.find(p => p.id === pdfId)
    if (!pdf) {
      toast.error('PDF nicht gefunden')
      return
    }

    setIsGenerating(true)
    setSelectedPdfForGeneration(pdfId)
    
    const toastId = toast.loading(`Generiere Probeexamen aus "${pdf.fileName}"...`)

    try {
      const allTopics = examTopics.map(t => `${t.id}. ${t.title}`).join('\n')
      const fileName = pdf.fileName

      console.log('[Exam Generation] Starting generation for:', fileName)

      const promptText = `Du bist ein Prüfungsexperte für Pflegeausbildung.

Erstelle ein mündliches Probeexamen mit GENAU 9 Fragen für die Lernsituation "${fileName}".

Die Fragen sollen sich auf die folgenden Themen beziehen (wähle relevante aus):
${allTopics}

Anforderungen:
1. GENAU 9 Fragen insgesamt
2. 3 einfache Fragen (easy)
3. 3 mittelschwere Fragen (medium)
4. 3 schwere Fragen (hard)
5. Jede Frage soll sich auf ein realistisches Pflegeszenario beziehen
6. Die Fragen sollen kritisches Denken fördern
7. Geeignet für ein 30-minütiges mündliches Examen

Gib die Antwort als JSON-Objekt zurück mit einer "questions" Eigenschaft.

Format:
{
  "questions": [
    {
      "question": "Die Frage",
      "suggestedAnswer": "Eine ausführliche Musterantwort (3-5 Sätze)",
      "difficulty": "easy|medium|hard",
      "relatedTopics": [1, 2, 3]
    }
  ]
}

Wichtig: Es müssen EXAKT 9 Fragen sein!`

      if (!window.spark?.llm) {
        throw new Error('Der Spark KI-Dienst ist nicht verfügbar. Bitte laden Sie die Seite neu.')
      }

      console.log('[Exam Generation] Calling LLM with prompt...')
      console.log('[Exam Generation] Prompt preview:', promptText.substring(0, 150))
      const response = await window.spark.llm(promptText, 'gpt-4o', true)
      console.log('[Exam Generation] LLM response received:', typeof response === 'string' ? response.substring(0, 200) : response)

      const parsed = parseExamResponse(response)
      console.log('[Exam Generation] Parsed response, question count:', parsed.questions?.length)

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Die LLM-Antwort enthält kein questions-Array')
      }

      if (parsed.questions.length !== 9) {
        console.warn(`[Exam Generation] Expected 9 questions, got ${parsed.questions.length}`)
      }

      const newExam: Exam = {
        id: `exam-${Date.now()}`,
        pdfFileName: pdf.fileName,
        createdAt: Date.now(),
        questions: parsed.questions.map(normalizeExamQuestion)
      }

      console.log('[Exam Generation] Created exam object:', newExam.id, 'with', newExam.questions.length, 'questions')
      
      setGeneratedExams(current => {
        const updated = [...(current || []), newExam]
        console.log('[Exam Generation] Updated exams list, total count:', updated.length)
        return updated
      })
      
      toast.success(`Probeexamen mit ${newExam.questions.length} Fragen erstellt!`, { id: toastId })
      setCurrentExam(newExam)
    } catch (error) {
      console.error('[Exam Generation] Error:', error)
      toast.error(`Fehler beim Generieren: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, { id: toastId })
    } finally {
      setIsGenerating(false)
      setSelectedPdfForGeneration(null)
    }
  }

  const handleStartPreparation = (exam: Exam) => {
    const now = Date.now()
    const attempt: ExamAttempt = {
      id: `attempt-${now}`,
      examId: exam.id,
      startedAt: now,
      prepNotes: '',
      userAnswers: {}
    }
    
    setCurrentAttempt(attempt)
    setCurrentExam(exam)
    setExamPhase('prep')
    setPrepNotes('')
    setPrepTimeRemaining(20 * 60)
    setPrepTimerActive(true)
    setExamStartTime(now)
  }

  const handleStartExamPhase = () => {
    setPrepTimerActive(false)
    setExamPhase('exam')
    setExamTimeRemaining(30 * 60)
    setExamTimerActive(true)
    setCurrentQuestionIndex(0)
    setCurrentAnswer('')
  }

  const handleSaveAnswer = () => {
    if (!currentAttempt || !currentExam) return
    
    const currentQuestion = currentExam.questions[currentQuestionIndex]
    setCurrentAttempt(prev => {
      if (!prev) return prev
      return {
        ...prev,
        userAnswers: {
          ...prev.userAnswers,
          [currentQuestion.id]: currentAnswer
        }
      }
    })
  }

  const handleNextQuestion = () => {
    if (!currentExam) return
    handleSaveAnswer()
    
    if (currentQuestionIndex < currentExam.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      const nextQ = currentExam.questions[currentQuestionIndex + 1]
      setCurrentAnswer(currentAttempt?.userAnswers[nextQ.id] || '')
    }
  }

  const handlePreviousQuestion = () => {
    if (!currentExam) return
    handleSaveAnswer()
    
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      const prevQ = currentExam.questions[currentQuestionIndex - 1]
      setCurrentAnswer(currentAttempt?.userAnswers[prevQ.id] || '')
    }
  }

  const handleFinishExam = () => {
    setExamTimerActive(false)
    handleSaveAnswer()
    
    if (currentAttempt) {
      const completedAttempt = {
        ...currentAttempt,
        completedAt: Date.now(),
        prepNotes: prepNotes
      }
      setCurrentAttempt(completedAttempt)
      setExamAttempts(current => [...(current || []), completedAttempt])
    }
    
    setExamPhase('review')
    toast.success('Examen abgeschlossen!')
  }

  const handleBackToOverview = () => {
    setCurrentExam(null)
    setCurrentAttempt(null)
    setExamPhase('prep')
    setPrepTimerActive(false)
    setExamTimerActive(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (currentExam && currentAttempt && examPhase === 'prep') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card shadow-sm">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{currentExam.pdfFileName}</h2>
                <p className="text-sm text-muted-foreground">Vorbereitungsphase - 20 Minuten</p>
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <Clock />
                  <span className="text-primary">{formatTime(prepTimeRemaining)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Verbleibende Zeit</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 md:px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vorbereitungsphase</CardTitle>
                <CardDescription>
                  Lesen Sie die 9 Fragen durch und machen Sie sich Notizen. Diese Notizen können Sie während des Examens verwenden.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {currentExam.questions.map((q, idx) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-4 rounded-lg bg-gradient-to-r from-muted/30 to-muted/10 border border-border"
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant={
                          q.difficulty === 'easy' ? 'secondary' :
                          q.difficulty === 'hard' ? 'destructive' : 'default'
                        }>
                          {q.difficulty === 'easy' ? 'Einfach' :
                           q.difficulty === 'hard' ? 'Schwer' : 'Mittel'}
                        </Badge>
                        <p className="font-medium text-sm flex-1">
                          <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                          {q.question}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Notebook size={16} />
                    Ihre Notizen
                  </label>
                  <Textarea
                    value={prepNotes}
                    onChange={(e) => setPrepNotes(e.target.value)}
                    placeholder="Machen Sie sich hier Notizen zu den Fragen..."
                    className="min-h-[250px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tipp: Notieren Sie Stichpunkte zu jeder Frage, die Ihnen während des Examens helfen können.
                  </p>
                </div>

                <Button 
                  onClick={handleStartExamPhase} 
                  className="w-full gap-2"
                  size="lg"
                >
                  Vorbereitung beenden und Examen starten
                  <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (currentExam && currentAttempt && examPhase === 'exam') {
    const currentQuestion = currentExam.questions[currentQuestionIndex]
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card shadow-sm">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">{currentExam.pdfFileName}</h2>
                <p className="text-sm text-muted-foreground">
                  Frage {currentQuestionIndex + 1} von {currentExam.questions.length}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <Clock />
                  <span className={examTimeRemaining < 300 ? 'text-destructive' : 'text-primary'}>
                    {formatTime(examTimeRemaining)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Verbleibende Zeit</p>
              </div>
            </div>
            <Progress 
              value={((currentQuestionIndex + 1) / currentExam.questions.length) * 100} 
              className="mt-3 h-2" 
            />
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 md:px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <CardTitle className="text-xl flex-1">
                        {currentQuestion.question}
                      </CardTitle>
                      <Badge variant={
                        currentQuestion.difficulty === 'easy' ? 'secondary' :
                        currentQuestion.difficulty === 'hard' ? 'destructive' : 'default'
                      }>
                        {currentQuestion.difficulty === 'easy' ? 'Einfach' :
                         currentQuestion.difficulty === 'hard' ? 'Schwer' : 'Mittel'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ihre Antwort</label>
                      <Textarea
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        placeholder="Geben Sie hier Ihre Antwort ein..."
                        className="min-h-[300px]"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <Button
                        variant="outline"
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="gap-2"
                      >
                        <ArrowLeft />
                        Vorherige Frage
                      </Button>

                      {currentQuestionIndex === currentExam.questions.length - 1 ? (
                        <Button onClick={handleFinishExam} size="lg" className="gap-2">
                          Examen beenden
                        </Button>
                      ) : (
                        <Button onClick={handleNextQuestion} className="gap-2">
                          Nächste Frage
                          <ArrowRight />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>

            {prepNotes && (
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Notebook size={16} />
                    Ihre Notizen aus der Vorbereitung
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[200px]">
                    <p className="text-sm whitespace-pre-wrap font-mono">{prepNotes}</p>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    )
  }

  if (currentExam && examPhase === 'review') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card shadow-sm">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Examen Review</h2>
                <p className="text-sm text-muted-foreground">{currentExam.pdfFileName}</p>
              </div>
              <Button onClick={handleBackToOverview} variant="outline">
                Zurück zur Übersicht
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="bg-gradient-to-r from-accent/10 to-primary/10">
              <CardHeader>
                <CardTitle>Ihre Antworten vs. Musterantworten</CardTitle>
                <CardDescription>
                  Vergleichen Sie Ihre Antworten mit den vorgeschlagenen Musterantworten und reflektieren Sie über Ihre Leistung
                </CardDescription>
              </CardHeader>
            </Card>

            {currentExam.questions.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          <span className="text-muted-foreground mr-2">Frage {idx + 1}:</span>
                          {q.question}
                        </CardTitle>
                      </div>
                      <Badge variant={
                        q.difficulty === 'easy' ? 'secondary' :
                        q.difficulty === 'hard' ? 'destructive' : 'default'
                      }>
                        {q.difficulty === 'easy' ? 'Einfach' :
                         q.difficulty === 'hard' ? 'Schwer' : 'Mittel'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2 text-muted-foreground">Ihre Antwort:</p>
                      <div className="p-4 rounded-lg bg-muted/50 border border-border">
                        <p className="text-sm whitespace-pre-wrap">
                          {currentAttempt?.userAnswers[q.id] || '(Keine Antwort gegeben)'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium mb-2 text-accent">Musterantwort:</p>
                      <div className="p-4 rounded-lg bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20">
                        <p className="text-sm whitespace-pre-wrap">{q.suggestedAnswer}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
              Examen 25/26
            </h1>
            <p className="text-sm text-muted-foreground">
              Mündliche Probeexamen für die Pflegeausbildung
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <Tabs defaultValue="pdfs" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="pdfs" className="gap-2">
              <FilePdf size={16} />
              Lernsituationen
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2">
              <Exam size={16} />
              Probeexamen
            </TabsTrigger>
            <TabsTrigger value="topics" className="gap-2">
              <List size={16} />
              Themen
            </TabsTrigger>
            <TabsTrigger value="statistics" className="gap-2">
              <ChartLine size={16} />
              Statistiken
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pdfs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Verfügbare Lernsituationen</CardTitle>
                <CardDescription>
                  Wählen Sie eine Lernsituation aus, um ein Probeexamen mit 9 Fragen zu generieren
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {availablePDFs.map((pdf) => {
                const existingExam = (generatedExams || []).find(e => e.pdfFileName === pdf.fileName)
                const isGenerating = selectedPdfForGeneration === pdf.id

                return (
                  <motion.div
                    key={pdf.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <FilePdf size={32} className="text-destructive shrink-0" />
                          <CardTitle className="text-base leading-tight flex-1">
                            {pdf.fileName}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {existingExam ? (
                          <div className="space-y-2">
                            <Badge variant="default" className="w-full justify-center gap-2">
                              <Exam size={14} />
                              Examen erstellt
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateExamFromPDF(pdf.id)}
                              disabled={isGenerating}
                              className="w-full gap-2"
                            >
                              <Sparkle size={16} />
                              Neu generieren
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => generateExamFromPDF(pdf.id)}
                            disabled={isGenerating}
                            className="w-full gap-2"
                            size="lg"
                          >
                            {isGenerating ? (
                              <>
                                <Sparkle size={16} className="animate-spin" />
                                Generiere...
                              </>
                            ) : (
                              <>
                                <Sparkle size={16} />
                                Probeexamen generieren
                              </>
                            )}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="exams" className="space-y-6">
            {(generatedExams || []).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <Exam size={64} className="mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Keine Probeexamen vorhanden</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generieren Sie ein Probeexamen aus einer Lernsituation
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(generatedExams || []).map(exam => {
                  const attempts = (examAttempts || []).filter(a => a.examId === exam.id)
                  
                  return (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Exam size={20} />
                            {exam.pdfFileName}
                          </CardTitle>
                          <CardDescription>
                            {exam.questions.length} Fragen · 20 Min. Vorbereitung · 30 Min. Examen
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock size={16} />
                            <span>Erstellt am {new Date(exam.createdAt).toLocaleDateString('de-DE')}</span>
                          </div>
                          
                          {attempts.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {attempts.length} Versuch{attempts.length > 1 ? 'e' : ''} absolviert
                            </p>
                          )}

                          <Button
                            onClick={() => handleStartPreparation(exam)}
                            className="w-full gap-2"
                            size="lg"
                          >
                            <Play size={16} />
                            Examen starten
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="topics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prüfungsthemen für das mündliche Examen</CardTitle>
                <CardDescription>
                  Alle {examTopics.length} Themen im Überblick
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-3">
              {examTopics.map((topic) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader className="py-4">
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="shrink-0 font-semibold">
                          #{topic.id}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm leading-tight">
                            {topic.title}
                          </CardTitle>
                          {topic.instructors.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {topic.instructors.map((instructor, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {instructor}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6">
            <StatisticsOverview stats={progressStats} examScores={examScores} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App
