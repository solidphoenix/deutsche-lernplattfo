import { useState, useMemo, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  CircleDashed
} from '@phosphor-icons/react'
import { examTopics } from '@/lib/topics'
import { PDFDocument, TopicProgress, LearningStatus } from '@/lib/types'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

function App() {
  const [pdfs, setPdfs] = useKV<PDFDocument[]>('exam-pdfs', [])
  const [progress, setProgress] = useKV<TopicProgress[]>('topic-progress', [])
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [selectedTopicForUpload, setSelectedTopicForUpload] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        const newPdf: PDFDocument = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          topicId: selectedTopicForUpload,
          fileName: file.name,
          fileData,
          uploadDate: Date.now(),
          fileSize: file.size
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

  const overallProgress = useMemo(() => {
    const completed = (progress || []).filter(p => p.status === 'completed').length
    return (completed / examTopics.length) * 100
  }, [progress])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
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
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">Alle Themen</TabsTrigger>
            <TabsTrigger value="uploads">Meine PDFs</TabsTrigger>
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
                        {topicPdfs.length > 0 && (
                          <CardContent>
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                Lernsituationen ({topicPdfs.length})
                              </p>
                              {topicPdfs.map((pdf) => (
                                <div
                                  key={pdf.id}
                                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FilePdf size={20} className="text-destructive shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium truncate">
                                        {pdf.fileName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatFileSize(pdf.fileSize)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => downloadPdf(pdf)}
                                    >
                                      <Download size={16} />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => deletePdf(pdf.id, pdf.fileName)}
                                    >
                                      <Trash size={16} />
                                    </Button>
                                  </div>
                                </div>
                              ))}
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
                            {topicPdfs.map(pdf => (
                              <div
                                key={pdf.id}
                                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <FilePdf size={24} className="text-destructive shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium truncate">{pdf.fileName}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatFileSize(pdf.fileSize)} · {new Date(pdf.uploadDate).toLocaleDateString('de-DE')}
                                    </p>
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
                                    Download
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deletePdf(pdf.id, pdf.fileName)}
                                    className="gap-2 text-destructive hover:text-destructive"
                                  >
                                    <Trash size={16} />
                                    Löschen
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
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
