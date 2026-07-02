import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  TrendUp, 
  TrendDown,
  Minus,
  Trophy,
  Target,
  Brain,
  Clock,
  CheckCircle,
  ChartBar
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import type { ProgressStats, TopicMastery, ExamScore } from '@/lib/statistics'
import {
  getMasteryColor,
  getMasteryBadgeVariant,
  getScoreColor,
  getScoreBadgeVariant
} from '@/lib/statistics'

interface StatisticsOverviewProps {
  stats: ProgressStats
  examScores: ExamScore[]
}

export function StatisticsOverview({ stats, examScores }: StatisticsOverviewProps) {
  const getTrendIcon = () => {
    switch (stats.improvementTrend) {
      case 'improving':
        return <TrendUp className="text-green-600" size={20} />
      case 'declining':
        return <TrendDown className="text-red-600" size={20} />
      default:
        return <Minus className="text-gray-600" size={20} />
    }
  }

  const getTrendText = () => {
    switch (stats.improvementTrend) {
      case 'improving':
        return 'Verbesserung erkennbar'
      case 'declining':
        return 'Leistung rückläufig'
      default:
        return 'Stabile Leistung'
    }
  }

  const getTrendColor = () => {
    switch (stats.improvementTrend) {
      case 'improving':
        return 'text-green-600'
      case 'declining':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <CheckCircle size={16} />
                Abgeschlossene Examen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats.totalExamsCompleted}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalQuestionsAnswered} Fragen beantwortet
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Target size={16} />
                Durchschnittliche Leistung
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getScoreColor(stats.averageScore)}`}>
                {stats.averageScore}%
              </div>
              <Progress 
                value={stats.averageScore} 
                className="mt-2 h-2" 
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5">
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <Brain size={16} />
                Beherrschte Themen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">
                {stats.topicsMastered}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                von 29 Themen
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="flex items-center gap-2">
                <ChartBar size={16} />
                Trend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-semibold flex items-center gap-2 ${getTrendColor()}`}>
                {getTrendIcon()}
                {getTrendText()}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {stats.recentScores.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Leistungsverlauf</CardTitle>
              <CardDescription>
                Ihre letzten {stats.recentScores.length} Examen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {stats.recentScores.map((score, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div className="relative w-full bg-muted rounded-t-md overflow-hidden">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${score}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        className={`w-full ${
                          score >= 80 
                            ? 'bg-green-500' 
                            : score >= 60 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                        }`}
                        style={{ 
                          minHeight: '4px',
                          position: 'absolute',
                          bottom: 0
                        }}
                      />
                      <div style={{ height: '120px' }} />
                    </div>
                    <span className="text-xs font-medium">{score}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {stats.strongTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="text-yellow-600" size={20} />
                  Stärken
                </CardTitle>
                <CardDescription>
                  Themen, die Sie gut beherrschen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {stats.strongTopics.map((topic) => (
                      <TopicMasteryCard key={topic.topicId} topic={topic} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {stats.weakTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="text-blue-600" size={20} />
                  Verbesserungspotenzial
                </CardTitle>
                <CardDescription>
                  Themen, die weitere Übung benötigen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {stats.weakTopics.map((topic) => (
                      <TopicMasteryCard key={topic.topicId} topic={topic} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {examScores.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Examen-Historie</CardTitle>
              <CardDescription>
                Detaillierte Übersicht aller absolvierten Examen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {examScores.map((score, idx) => (
                    <ExamScoreCard key={score.attemptId} score={score} index={idx} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

function TopicMasteryCard({ topic }: { topic: TopicMastery }) {
  const answerRate = topic.timesAppeared > 0 
    ? (topic.timesAnswered / topic.timesAppeared) * 100 
    : 0

  const getMasteryLabel = (level: string) => {
    switch (level) {
      case 'expert': return 'Experte'
      case 'advanced': return 'Fortgeschritten'
      case 'intermediate': return 'Mittel'
      default: return 'Anfänger'
    }
  }

  return (
    <div className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-medium flex-1 leading-tight">
          {topic.topicTitle}
        </p>
        <Badge variant={getMasteryBadgeVariant(topic.masteryLevel)}>
          {getMasteryLabel(topic.masteryLevel)}
        </Badge>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{topic.timesAnswered} / {topic.timesAppeared} beantwortet</span>
          <span className={getMasteryColor(topic.masteryLevel)}>
            {Math.round(answerRate)}%
          </span>
        </div>
        <Progress value={answerRate} className="h-1" />
        {topic.lastPracticed && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={12} />
            Zuletzt: {new Date(topic.lastPracticed).toLocaleDateString('de-DE')}
          </div>
        )}
      </div>
    </div>
  )
}

function ExamScoreCard({ score, index }: { score: ExamScore; index: number }) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-lg border bg-gradient-to-r from-card to-muted/20"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{score.pdfFileName}</h4>
          <p className="text-xs text-muted-foreground">
            {new Date(score.completedAt).toLocaleDateString('de-DE', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <Badge variant={getScoreBadgeVariant(score.score)}>
          {score.score}%
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Fragen beantwortet</p>
          <p className="font-medium">
            {score.answeredQuestions} / {score.totalQuestions}
          </p>
        </div>
        {score.timeSpent > 0 && (
          <div>
            <p className="text-muted-foreground text-xs">Benötigte Zeit</p>
            <p className="font-medium">{formatDuration(score.timeSpent)}</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t">
        <p className="text-xs text-muted-foreground mb-2">Nach Schwierigkeit:</p>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs font-medium text-green-600">Einfach</p>
            <p className="text-sm">
              {score.difficulty.easy.answered}/{score.difficulty.easy.total}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-yellow-600">Mittel</p>
            <p className="text-sm">
              {score.difficulty.medium.answered}/{score.difficulty.medium.total}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-red-600">Schwer</p>
            <p className="text-sm">
              {score.difficulty.hard.answered}/{score.difficulty.hard.total}
            </p>
          </div>
        </div>
      </div>

      {score.topicsCovered.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">
            Abgedeckte Themen: {score.topicsCovered.length}
          </p>
          <div className="flex flex-wrap gap-1">
            {score.topicsCovered.slice(0, 10).map((topicId) => (
              <Badge key={topicId} variant="outline" className="text-xs">
                #{topicId}
              </Badge>
            ))}
            {score.topicsCovered.length > 10 && (
              <Badge variant="outline" className="text-xs">
                +{score.topicsCovered.length - 10}
              </Badge>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
