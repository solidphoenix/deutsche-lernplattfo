import { useState, useMemo, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  UploadSimple, 
  FilePdf, 
  CheckCircle, 
  Circle, 
  Trash, 
  MagnifyingGlass,
  Download,
  CircleDashed,
  Sparkle,
  Cards,
  Exam,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Clock,
  Notebook
} from '@phosphor-icons/react'
import { examTopics } from '@/lib/topics'
import { PDFDocument, TopicProgress, LearningStatus, Question, GeneratedExam, Flashcard, ExamAttempt } from '@/lib/types'
import { extractTextFromPDF, findStoryInText } from '@/lib/pdf-utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

function App() {
  const [pdfs, setPdfs] = useKV<PDFDocument[]>('exam-pdfs', [])
  const [progress, setProgress] = useKV<TopicProgress[]>('topic-progress', [])
  const [questions, setQuestions] = useKV<Question[]>('generated-questions', [])
  const [exams, setExams] = useKV<GeneratedExam[]>('generated-exams', [])
  const [flashcards, setFlashcards] = useKV<Flashcard[]>('flashcards', [])
  const [examAttempts, setExamAttempts] = useKV<ExamAttempt[]>('exam-attempts', [])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedTopicForUpload, setSelectedTopicForUpload] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedPdfForQuestions, setSelectedPdfForQuestions] = useState<string | null>(null)
  const [currentExamView, setCurrentExamView] = useState<GeneratedExam | null>(null)
  const [currentExamAttempt, setCurrentExamAttempt] = useState<ExamAttempt | null>(null)
  const [examPhase, setExamPhase] = useState<'prep' | 'exam' | 'review'>('prep')
  const [prepNotes, setPrepNotes] = useState('')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [flashcardMode, setFlashcardMode] = useState<'learn' | 'review'>('learn')
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0)
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false)
  const [selectedTopicForFlashcards, setSelectedTopicForFlashcards] = useState<number | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prepTimerRef = useRef<number | null>(null)
  const examTimerRef = useRef<number | null>(null)
  const [prepTimeRemaining, setPrepTimeRemaining] = useState(20 * 60)
  const [examTimeRemaining, setExamTimeRemaining] = useState(30 * 60)

  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return examTopics
    const query = searchQuery.toLowerCase()
    return examTopics.filter(topic => 
      topic.title.toLowerCase().includes(query) ||
      topic.instructors.some(instructor => instructor.toLowerCase().includes(query))
    )
  }, [searchQuery])

  const getTopicProgress = (topicId: number): LearningStatus => {
    const topicProgress = progress?.find(p => p.topicId === topicId)
    return topicProgress?.status || 'not-started'
  }

  const toggleTopicStatus = (topicId: number) => {
    setProgress(currentProgress => {
      const current = currentProgress || []
      const existing = current.find(p => p.topicId === topicId)
      const statusCycle: LearningStatus[] = ['not-started', 'in-progress', 'completed']
      const currentStatus = existing?.status || 'not-started'
      const currentIndex = statusCycle.indexOf(currentStatus)
      const newStatus = statusCycle[(currentIndex + 1) % statusCycle.length]

      if (existing) {
        return current.map(p => 
          p.topicId === topicId ? { ...p, status: newStatus } : p
        )
      } else {
        return [...current, { topicId, status: newStatus }]
      }
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Nur PDF-Dateien sind erlaubt')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max. 10 MB)')
      return
    }

    if (selectedTopicForUpload === null) {
      toast.error('Bitte wählen Sie ein Thema aus')
      return
    }

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const fileData = e.target?.result as string
        
        toast.info('Extrahiere Text aus PDF...')
        const extractedText = await extractTextFromPDF(fileData)
        const story = findStoryInText(extractedText)
        
        const newPdf: PDFDocument = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          topicId: selectedTopicForUpload,
          fileName: file.name,
          fileData,
          uploadDate: Date.now(),
          fileSize: file.size,
          extractedText: extractedText,
          story: story || undefined
        }

        setPdfs(currentPdfs => [...(currentPdfs || []), newPdf])
        toast.success(`${file.name} erfolgreich hochgeladen`)
        setUploadDialogOpen(false)
        setSelectedTopicForUpload(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error('Fehler beim Hochladen der Datei')
    }
  }

  const deletePdf = (pdfId: string, fileName: string) => {
    setPdfs(currentPdfs => (currentPdfs || []).filter(pdf => pdf.id !== pdfId))
    setQuestions(currentQuestions => (currentQuestions || []).filter(q => q.pdfId !== pdfId))
    toast.success(`${fileName} wurde gelöscht`)
  }

  const downloadPdf = (pdf: PDFDocument) => {
    const link = document.createElement('a')
    link.href = pdf.fileData
    link.download = pdf.fileName
    link.click()
  }

  const getTopicPdfs = (topicId: number) => {
    return (pdfs || []).filter(pdf => pdf.topicId === topicId)
  }

  const generateQuestionsForPdf = async (pdfId: string) => {
    const pdf = (pdfs || []).find(p => p.id === pdfId)
    if (!pdf || !pdf.story) {
      toast.error('Keine Story in diesem PDF gefunden')
      return
    }

    setIsGenerating(true)
    toast.info('Generiere Fragen...')

    try {
      const topic = examTopics.find(t => t.id === pdf.topicId)
      const relatedTopicIds = examTopics
        .filter(t => t.instructors.some(i => topic?.instructors.includes(i)))
        .map(t => t.id)
        .slice(0, 3)

      const promptText = `Du bist ein Prüfungsexperte für Pflegeausbildung. Basierend auf der folgenden Story aus einer Lernsituation, generiere genau 9 Prüfungsfragen für ein mündliches Examen.

Story: ${pdf.story}

Hauptthema: ${topic?.title || 'Unbekannt'}

Die Fragen sollten:
1. Direkt auf die Story Bezug nehmen
2. Das Hauptthema "${topic?.title}" abdecken
3. Unterschiedliche Schwierigkeitsgrade haben (3 einfach, 3 mittel, 3 schwer)
4. Kritisches Denken fördern
5. Für ein 30-minütiges mündliches Examen geeignet sein

Gib die Antwort als JSON-Objekt mit einer "questions" Eigenschaft zurück, die ein Array von Fragen enthält.

Format:
{
  "questions": [
    {
      "question": "Die Frage",
      "suggestedAnswer": "Eine ausführliche Musterantwort mit Bezug zur Story",
      "difficulty": "easy|medium|hard",
      "relatedTopics": [Themen-IDs]
    }
  ]
}`

      const response = await window.spark.llm(promptText, 'gpt-4o', true)
      const parsed = JSON.parse(response)

      const newQuestions: Question[] = parsed.questions.map((q: any, index: number) => ({
        id: `${pdfId}-q${index}-${Date.now()}`,
        pdfId: pdf.id,
        topicId: pdf.topicId,
        question: q.question,
        suggestedAnswer: q.suggestedAnswer,
        difficulty: q.difficulty || 'medium',
        relatedTopics: q.relatedTopics || relatedTopicIds
      }))

      setQuestions(currentQuestions => [
        ...(currentQuestions || []).filter(q => q.pdfId !== pdfId),
        ...newQuestions
      ])

      toast.success(`${newQuestions.length} Fragen generiert!`)
    } catch (error) {
      console.error('Error generating questions:', error)
      toast.error('Fehler beim Generieren der Fragen')
    } finally {
      setIsGenerating(false)
    }
  }

  const createExamFromPdf = async (pdfId: string) => {
    const pdfQuestions = (questions || []).filter(q => q.pdfId === pdfId)
    
    if (pdfQuestions.length === 0) {
      await generateQuestionsForPdf(pdfId)
      return
    }

    const pdf = (pdfs || []).find(p => p.id === pdfId)
    if (!pdf) return

    const newExam: GeneratedExam = {
      id: `exam-${Date.now()}`,
      name: `Probeexamen: ${pdf.fileName}`,
      createdAt: Date.now(),
      questions: pdfQuestions,
      timeLimit: 30 * 60,
      preparationTime: 20 * 60
    }

    setExams(currentExams => [...(currentExams || []), newExam])
    toast.success('Probeexamen erstellt!')
    setCurrentExamView(newExam)
  }

  const startExamPreparation = (exam: GeneratedExam) => {
    const attempt: ExamAttempt = {
      id: `attempt-${Date.now()}`,
      examId: exam.id,
      startedAt: Date.now(),
      userAnswers: {},
      notes: ''
    }
    
    setCurrentExamAttempt(attempt)
    setExamPhase('prep')
    setPrepTimeRemaining(exam.preparationTime)
    setPrepNotes('')
    
    prepTimerRef.current = window.setInterval(() => {
      setPrepTimeRemaining(prev => {
        if (prev <= 1) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current)
          toast.info('Vorbereitungszeit ist um! Das Examen beginnt jetzt.')
          startExamPhase(exam)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const startExamPhase = (exam: GeneratedExam) => {
    if (prepTimerRef.current) clearInterval(prepTimerRef.current)
    
    setExamPhase('exam')
    setExamTimeRemaining(exam.timeLimit)
    setCurrentQuestionIndex(0)
    setCurrentAnswer('')
    
    examTimerRef.current = window.setInterval(() => {
      setExamTimeRemaining(prev => {
        if (prev <= 1) {
          if (examTimerRef.current) clearInterval(examTimerRef.current)
          finishExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const saveCurrentAnswer = () => {
    if (!currentExamAttempt || !currentExamView) return
    
    const currentQuestion = currentExamView.questions[currentQuestionIndex]
    setCurrentExamAttempt({
      ...currentExamAttempt,
      userAnswers: {
        ...currentExamAttempt.userAnswers,
        [currentQuestion.id]: currentAnswer
      }
    })
  }

  const nextQuestion = () => {
    if (!currentExamView) return
    saveCurrentAnswer()
    
    if (currentQuestionIndex < currentExamView.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      const nextQ = currentExamView.questions[currentQuestionIndex + 1]
      setCurrentAnswer(currentExamAttempt?.userAnswers[nextQ.id] || '')
    }
  }

  const previousQuestion = () => {
    saveCurrentAnswer()
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      const prevQ = currentExamView!.questions[currentQuestionIndex - 1]
      setCurrentAnswer(currentExamAttempt?.userAnswers[prevQ.id] || '')
    }
  }

  const finishExam = () => {
    if (examTimerRef.current) clearInterval(examTimerRef.current)
    saveCurrentAnswer()
    
    if (currentExamAttempt) {
      setCurrentExamAttempt({
        ...currentExamAttempt,
        completedAt: Date.now(),
        notes: prepNotes
      })
      setExamAttempts(current => [...(current || []), {
        ...currentExamAttempt,
        completedAt: Date.now(),
        notes: prepNotes
      }])
    }
    
    setExamPhase('review')
    toast.success('Examen abgeschlossen!')
  }

  const generateFlashcardsForPdf = async (pdfId: string) => {
    const pdf = (pdfs || []).find(p => p.id === pdfId)
    if (!pdf || !pdf.story) {
      toast.error('Keine Story in diesem PDF gefunden')
      return
    }

    setIsGenerating(true)
    toast.info('Generiere Lernkarten...')

    try {
      const topic = examTopics.find(t => t.id === pdf.topicId)

      const promptText = `Du bist ein Lernexperte für Pflegeausbildung. Basierend auf der folgenden Story, erstelle 10-15 Lernkarten (Flashcards) zum Thema "${topic?.title}".

Story: ${pdf.story}

Jede Lernkarte sollte:
1. Eine prägnante Frage oder einen Begriff auf der Vorderseite haben
2. Eine klare, informative Antwort auf der Rückseite
3. Wichtige Konzepte aus der Story aufgreifen
4. Zum aktiven Lernen anregen

Gib die Antwort als JSON-Objekt mit einer "flashcards" Eigenschaft zurück.

Format:
{
  "flashcards": [
    {
      "front": "Frage oder Begriff",
      "back": "Antwort oder Erklärung"
    }
  ]
}`

      const response = await window.spark.llm(promptText, 'gpt-4o', true)
      const parsed = JSON.parse(response)

      const newFlashcards: Flashcard[] = parsed.flashcards.map((fc: any, index: number) => ({
        id: `${pdfId}-fc${index}-${Date.now()}`,
        topicId: pdf.topicId,
        pdfId: pdf.id,
        front: fc.front,
        back: fc.back,
        correctCount: 0,
        incorrectCount: 0
      }))

      setFlashcards(currentCards => [
        ...(currentCards || []),
        ...newFlashcards
      ])

      toast.success(`${newFlashcards.length} Lernkarten erstellt!`)
    } catch (error) {
      console.error('Error generating flashcards:', error)
      toast.error('Fehler beim Generieren der Lernkarten')
    } finally {
      setIsGenerating(false)
    }
  }

  const markFlashcard = (flashcardId: string, correct: boolean) => {
    setFlashcards(currentCards => 
      (currentCards || []).map(card => 
        card.id === flashcardId
          ? {
              ...card,
              correctCount: correct ? card.correctCount + 1 : card.correctCount,
              incorrectCount: !correct ? card.incorrectCount + 1 : card.incorrectCount,
              lastReviewed: Date.now()
            }
          : card
      )
    )

    setShowFlashcardAnswer(false)
    
    if (currentFlashcardIndex < getTopicFlashcards(selectedTopicForFlashcards || 0).length - 1) {
      setCurrentFlashcardIndex(prev => prev + 1)
    } else {
      setCurrentFlashcardIndex(0)
      toast.success('Alle Karten durchgegangen!')
    }
  }

  const getTopicFlashcards = (topicId: number) => {
    return (flashcards || []).filter(fc => fc.topicId === topicId)
  }

  const overallProgress = useMemo(() => {
    const completed = (progress || []).filter(p => p.status === 'completed').length
    return (completed / examTopics.length) * 100
  }, [progress])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusIcon = (status: LearningStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle weight="fill" className="text-accent" />
      case 'in-progress':
        return <CircleDashed weight="bold" className="text-primary" />
      default:
        return <Circle className="text-muted-foreground" />
    }
  }

  const getStatusLabel = (status: LearningStatus) => {
    switch (status) {
      case 'completed':
        return 'Abgeschlossen'
      case 'in-progress':
        return 'In Bearbeitung'
      default:
        return 'Nicht begonnen'
    }
  }

  const getStatusBadgeVariant = (status: LearningStatus) => {
    switch (status) {
      case 'completed':
        return 'default'
      case 'in-progress':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (currentExamView && currentExamAttempt && examPhase !== 'review') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{currentExamView.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {examPhase === 'prep' ? 'Vorbereitungsphase' : 'Prüfungsphase'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Clock />
                    {formatTime(examPhase === 'prep' ? prepTimeRemaining : examTimeRemaining)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {examPhase === 'prep' ? 'Vorbereitung' : 'Examen'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 md:px-6 py-6">
          {examPhase === 'prep' ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Vorbereitungsphase - 20 Minuten</CardTitle>
                  <CardDescription>
                    Machen Sie sich Notizen zu den folgenden Fragen. Diese Notizen können Sie während des Examens verwenden.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {currentExamView.questions.map((q, idx) => (
                      <div key={q.id} className="p-3 rounded-lg bg-muted/50">
                        <p className="font-medium text-sm">
                          {idx + 1}. {q.question}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ihre Notizen</label>
                    <Textarea
                      value={prepNotes}
                      onChange={(e) => setPrepNotes(e.target.value)}
                      placeholder="Machen Sie sich hier Notizen..."
                      className="min-h-[200px]"
                    />
                  </div>

                  <Button 
                    onClick={() => startExamPhase(currentExamView)} 
                    className="w-full"
                    size="lg"
                  >
                    Vorbereitung beenden und Examen starten
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Frage {currentQuestionIndex + 1} von {currentExamView.questions.length}
                </p>
                <Progress value={((currentQuestionIndex + 1) / currentExamView.questions.length) * 100} className="w-32 h-2" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">
                    {currentExamView.questions[currentQuestionIndex].question}
                  </CardTitle>
                  <CardDescription>
                    <Badge variant={
                      currentExamView.questions[currentQuestionIndex].difficulty === 'easy' ? 'secondary' :
                      currentExamView.questions[currentQuestionIndex].difficulty === 'hard' ? 'destructive' : 'default'
                    }>
                      {currentExamView.questions[currentQuestionIndex].difficulty === 'easy' ? 'Einfach' :
                       currentExamView.questions[currentQuestionIndex].difficulty === 'hard' ? 'Schwer' : 'Mittel'}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Ihre Antwort..."
                    className="min-h-[300px]"
                  />

                  <div className="flex items-center justify-between gap-4">
                    <Button
                      variant="outline"
                      onClick={previousQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      <ArrowLeft className="mr-2" />
                      Vorherige Frage
                    </Button>

                    {currentQuestionIndex === currentExamView.questions.length - 1 ? (
                      <Button onClick={finishExam} size="lg">
                        Examen beenden
                      </Button>
                    ) : (
                      <Button onClick={nextQuestion}>
                        Nächste Frage
                        <ArrowRight className="ml-2" />
                      </Button>
                    )}
                  </div>

                  {prepNotes && (
                    <Card className="bg-muted/30">
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Notebook size={16} />
                          Ihre Notizen
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{prepNotes}</p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    )
  }

  if (currentExamView && examPhase === 'review') {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Examen Review</h2>
                <p className="text-sm text-muted-foreground">{currentExamView.name}</p>
              </div>
              <Button onClick={() => {
                setCurrentExamView(null)
                setCurrentExamAttempt(null)
                setExamPhase('prep')
              }}>
                Zurück zur Übersicht
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-6 py-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ihre Antworten vs. Musterantworten</CardTitle>
                <CardDescription>
                  Vergleichen Sie Ihre Antworten mit den vorgeschlagenen Musterantworten
                </CardDescription>
              </CardHeader>
            </Card>

            {currentExamView.questions.map((q, idx) => (
              <Card key={q.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        Frage {idx + 1}: {q.question}
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
                    <p className="text-sm font-medium mb-2">Ihre Antwort:</p>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-sm whitespace-pre-wrap">
                        {currentExamAttempt?.userAnswers[q.id] || '(Keine Antwort)'}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Musterantwort:</p>
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                      <p className="text-sm whitespace-pre-wrap">{q.suggestedAnswer}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">
                Examen 25/26
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Themen zum mündlichen Examen
              </p>
            </div>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <UploadSimple size={20} />
                  PDF hochladen
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Lernsituation hochladen</DialogTitle>
                  <DialogDescription>
                    Laden Sie eine PDF-Datei hoch und ordnen Sie sie einem Thema zu.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Thema auswählen</label>
                    <Select
                      value={selectedTopicForUpload?.toString()}
                      onValueChange={(value) => setSelectedTopicForUpload(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wählen Sie ein Thema..." />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-72">
                          {examTopics.map(topic => (
                            <SelectItem key={topic.id} value={topic.id.toString()}>
                              {topic.id}. {topic.title.substring(0, 60)}...
                            </SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">PDF-Datei</label>
                    <Input
                      ref={fileInputRef}
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximale Dateigröße: 10 MB
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="all">Themen</TabsTrigger>
            <TabsTrigger value="uploads">PDFs</TabsTrigger>
            <TabsTrigger value="exams">Probeexamen</TabsTrigger>
            <TabsTrigger value="flashcards">Lernkarten</TabsTrigger>
            <TabsTrigger value="progress">Fortschritt</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                placeholder="Themen oder Dozenten durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredTopics.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Keine Themen gefunden</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTopics.map((topic) => {
                  const status = getTopicProgress(topic.id)
                  const topicPdfs = getTopicPdfs(topic.id)
                  const topicFlashcards = getTopicFlashcards(topic.id)
                  
                  return (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="h-full transition-all hover:shadow-lg hover:scale-[1.02] duration-200">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="font-semibold">
                                  #{topic.id}
                                </Badge>
                                <Badge variant={getStatusBadgeVariant(status)}>
                                  {getStatusLabel(status)}
                                </Badge>
                              </div>
                              <CardTitle className="text-base leading-tight">
                                {topic.title}
                              </CardTitle>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleTopicStatus(topic.id)}
                              className="shrink-0"
                            >
                              {getStatusIcon(status)}
                            </Button>
                          </div>
                          {topic.instructors.length > 0 && (
                            <CardDescription className="flex flex-wrap gap-1 mt-2">
                              {topic.instructors.map((instructor, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {instructor}
                                </Badge>
                              ))}
                            </CardDescription>
                          )}
                        </CardHeader>
                        {(topicPdfs.length > 0 || topicFlashcards.length > 0) && (
                          <CardContent>
                            <div className="space-y-2">
                              {topicPdfs.length > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                  <FilePdf size={16} className="text-destructive" />
                                  <span>{topicPdfs.length} Lernsituation{topicPdfs.length > 1 ? 'en' : ''}</span>
                                </div>
                              )}
                              {topicFlashcards.length > 0 && (
                                <div className="flex items-center gap-2 text-xs">
                                  <Cards size={16} className="text-primary" />
                                  <span>{topicFlashcards.length} Lernkarte{topicFlashcards.length > 1 ? 'n' : ''}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="uploads" className="space-y-6">
            {(pdfs || []).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <FilePdf size={64} className="mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Keine PDFs hochgeladen</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Laden Sie Ihre erste Lernsituation hoch, um loszulegen
                    </p>
                  </div>
                  <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
                    <UploadSimple size={20} />
                    PDF hochladen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {examTopics
                  .filter(topic => getTopicPdfs(topic.id).length > 0)
                  .map(topic => {
                    const topicPdfs = getTopicPdfs(topic.id)
                    return (
                      <Card key={topic.id}>
                        <CardHeader>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{topic.id}</Badge>
                            <CardTitle className="text-base">{topic.title}</CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {topicPdfs.map(pdf => {
                              const pdfQuestions = (questions || []).filter(q => q.pdfId === pdf.id)
                              
                              return (
                                <div
                                  key={pdf.id}
                                  className="flex flex-col gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <FilePdf size={24} className="text-destructive shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium truncate">{pdf.fileName}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {formatFileSize(pdf.fileSize)} · {new Date(pdf.uploadDate).toLocaleDateString('de-DE')}
                                        </p>
                                        {pdf.story && (
                                          <p className="text-xs text-accent mt-1">✓ Story erkannt</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => downloadPdf(pdf)}
                                        className="gap-2"
                                      >
                                        <Download size={16} />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => deletePdf(pdf.id, pdf.fileName)}
                                        className="gap-2 text-destructive hover:text-destructive"
                                      >
                                        <Trash size={16} />
                                      </Button>
                                    </div>
                                  </div>

                                  {pdf.story && (
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        size="sm"
                                        variant={pdfQuestions.length > 0 ? 'secondary' : 'default'}
                                        onClick={() => generateQuestionsForPdf(pdf.id)}
                                        disabled={isGenerating}
                                        className="gap-2"
                                      >
                                        <Sparkle size={16} />
                                        {pdfQuestions.length > 0 ? `${pdfQuestions.length} Fragen` : 'Fragen generieren'}
                                      </Button>
                                      
                                      {pdfQuestions.length > 0 && (
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() => createExamFromPdf(pdf.id)}
                                          className="gap-2"
                                        >
                                          <Exam size={16} />
                                          Probeexamen erstellen
                                        </Button>
                                      )}

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => generateFlashcardsForPdf(pdf.id)}
                                        disabled={isGenerating}
                                        className="gap-2"
                                      >
                                        <Cards size={16} />
                                        Lernkarten erstellen
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exams" className="space-y-6">
            {(exams || []).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <Exam size={64} className="mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Keine Probeexamen erstellt</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Generieren Sie zuerst Fragen aus Ihren PDFs
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(exams || []).map(exam => {
                  const attempts = (examAttempts || []).filter(a => a.examId === exam.id)
                  
                  return (
                    <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Exam size={20} />
                          {exam.name}
                        </CardTitle>
                        <CardDescription>
                          {exam.questions.length} Fragen · {formatTime(exam.timeLimit)} Zeit
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock size={16} />
                          <span>{formatTime(exam.preparationTime)} Vorbereitung</span>
                        </div>
                        
                        {attempts.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {attempts.length} Versuch{attempts.length > 1 ? 'e' : ''}
                          </p>
                        )}

                        <Button
                          onClick={() => startExamPreparation(exam)}
                          className="w-full gap-2"
                        >
                          <BookOpen size={16} />
                          Examen starten
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="flashcards" className="space-y-6">
            {(flashcards || []).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-4">
                  <Cards size={64} className="mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Keine Lernkarten erstellt</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Erstellen Sie Lernkarten aus Ihren PDFs
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Thema auswählen</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedTopicForFlashcards?.toString() || ''}
                      onValueChange={(value) => {
                        setSelectedTopicForFlashcards(parseInt(value))
                        setCurrentFlashcardIndex(0)
                        setShowFlashcardAnswer(false)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Wählen Sie ein Thema..." />
                      </SelectTrigger>
                      <SelectContent>
                        {examTopics
                          .filter(t => getTopicFlashcards(t.id).length > 0)
                          .map(topic => (
                            <SelectItem key={topic.id} value={topic.id.toString()}>
                              #{topic.id} {topic.title.substring(0, 50)}... ({getTopicFlashcards(topic.id).length} Karten)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                {selectedTopicForFlashcards && getTopicFlashcards(selectedTopicForFlashcards).length > 0 && (
                  <div className="max-w-2xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Karte {currentFlashcardIndex + 1} von {getTopicFlashcards(selectedTopicForFlashcards).length}
                      </p>
                      <Progress 
                        value={((currentFlashcardIndex + 1) / getTopicFlashcards(selectedTopicForFlashcards).length) * 100} 
                        className="w-32 h-2" 
                      />
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentFlashcardIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card 
                          className="min-h-[300px] cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => setShowFlashcardAnswer(!showFlashcardAnswer)}
                        >
                          <CardContent className="flex items-center justify-center p-8 min-h-[300px]">
                            <div className="text-center space-y-4">
                              <p className="text-sm text-muted-foreground">
                                {showFlashcardAnswer ? 'Antwort' : 'Frage'}
                              </p>
                              <p className="text-xl font-medium">
                                {showFlashcardAnswer 
                                  ? getTopicFlashcards(selectedTopicForFlashcards)[currentFlashcardIndex].back
                                  : getTopicFlashcards(selectedTopicForFlashcards)[currentFlashcardIndex].front
                                }
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Klicken um {showFlashcardAnswer ? 'Frage' : 'Antwort'} zu sehen
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </AnimatePresence>

                    {showFlashcardAnswer && (
                      <div className="flex gap-4 justify-center">
                        <Button
                          variant="destructive"
                          onClick={() => markFlashcard(getTopicFlashcards(selectedTopicForFlashcards)[currentFlashcardIndex].id, false)}
                          className="gap-2"
                        >
                          Falsch
                        </Button>
                        <Button
                          variant="default"
                          onClick={() => markFlashcard(getTopicFlashcards(selectedTopicForFlashcards)[currentFlashcardIndex].id, true)}
                          className="gap-2"
                        >
                          Richtig
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <CheckCircle size={14} className="text-accent" />
                        <span>{getTopicFlashcards(selectedTopicForFlashcards)[currentFlashcardIndex].correctCount} richtig</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Circle size={14} className="text-destructive" />
                        <span>{getTopicFlashcards(selectedTopicForFlashcards)[currentFlashcardIndex].incorrectCount} falsch</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gesamtfortschritt</CardTitle>
                <CardDescription>
                  {(progress || []).filter(p => p.status === 'completed').length} von {examTopics.length} Themen abgeschlossen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={overallProgress} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {Math.round(overallProgress)}% abgeschlossen
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Nicht begonnen</CardDescription>
                  <CardTitle className="text-3xl">
                    {examTopics.length - (progress || []).filter(p => p.status !== 'not-started').length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>In Bearbeitung</CardDescription>
                  <CardTitle className="text-3xl text-primary">
                    {(progress || []).filter(p => p.status === 'in-progress').length}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Abgeschlossen</CardDescription>
                  <CardTitle className="text-3xl text-accent">
                    {(progress || []).filter(p => p.status === 'completed').length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lernaktivität</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">PDFs hochgeladen</span>
                    <Badge>{(pdfs || []).length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fragen generiert</span>
                    <Badge>{(questions || []).length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Probeexamen</span>
                    <Badge>{(exams || []).length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Lernkarten</span>
                    <Badge>{(flashcards || []).length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Examen-Versuche</span>
                    <Badge>{(examAttempts || []).length}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lernkarten-Statistik</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Gesamt</span>
                    <Badge>{(flashcards || []).length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Richtig beantwortet</span>
                    <Badge variant="default">
                      {(flashcards || []).reduce((sum, fc) => sum + fc.correctCount, 0)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Falsch beantwortet</span>
                    <Badge variant="destructive">
                      {(flashcards || []).reduce((sum, fc) => sum + fc.incorrectCount, 0)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Themenübersicht</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {examTopics.map(topic => {
                      const status = getTopicProgress(topic.id)
                      return (
                        <div
                          key={topic.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleTopicStatus(topic.id)}
                            className="shrink-0"
                          >
                            {getStatusIcon(status)}
                          </Button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              #{topic.id} {topic.title}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(status)}>
                            {getStatusLabel(status)}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default App
