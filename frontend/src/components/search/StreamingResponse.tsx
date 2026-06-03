'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { CheckCircle, Sparkles, Lightbulb, ChevronDown, Globe, Link2, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { convertReferencesToMarkdownLinks, createReferenceLinkComponent } from '@/lib/utils/source-references'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { useTranslation } from '@/lib/hooks/use-translation'
import { toast } from 'sonner'

interface StrategyData {
  reasoning: string
  searches: Array<{ term: string; instructions: string }>
}

interface Source {
  title: string
  url: string
  content?: string
}

interface StreamingResponseProps {
  isStreaming: boolean
  strategy: StrategyData | null
  answers: string[]
  finalAnswer: string | null
  sources?: Source[] | null
  status?: string | null
}

export function StreamingResponse({
  isStreaming,
  strategy,
  answers,
  finalAnswer,
  sources,
  status
}: StreamingResponseProps) {
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [answersOpen, setAnswersOpen] = useState(false)
  const { openModal } = useModalManager()
  const { t } = useTranslation()

  const handleReferenceClick = (type: string, id: string) => {
    const modalType = type === 'source_insight' ? 'insight' : type as 'source' | 'note' | 'insight'

    try {
      openModal(modalType, id)
    } catch {
      const typeLabel = type === 'source_insight' ? 'insight' : type
      toast.error(t('common.itemNotFound').replace('{type}', typeLabel))
    }
  }

  if (!strategy && !answers.length && !finalAnswer && !isStreaming && !sources?.length && !status) {
    return null
  }

  return (
    <div
      className="space-y-4 mt-6 max-h-[60vh] overflow-y-auto pr-2"
      role="region"
      aria-label={t('common.accessibility.askResponse')}
      aria-live="polite"
      aria-busy={isStreaming}
    >
      {/* SSE Status Banner */}
      {status && isStreaming && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5 text-primary text-xs font-medium animate-pulse backdrop-blur-md shadow-sm">
          <LoadingSpinner size="sm" className="text-primary" />
          <span>{status}</span>
        </div>
      )}

      {/* Strategy Section - Collapsible */}
      {strategy && (
        <Collapsible open={strategyOpen} onOpenChange={setStrategyOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t('common.strategy')}
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${strategyOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-3 pt-0">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('common.reasoning')}:</p>
                  <p className="text-sm">{strategy.reasoning}</p>
                </div>
                {strategy.searches.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t('common.searchTerms')}:</p>
                    <div className="space-y-2">
                      {strategy.searches.map((search, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">{i + 1}</Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{search.term}</p>
                            <p className="text-xs text-muted-foreground">{search.instructions}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Individual Answers Section - Collapsible */}
      {answers.length > 0 && (
        <Collapsible open={answersOpen} onOpenChange={setAnswersOpen}>
          <Card>
            <CardHeader>
              <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  {t('common.individualAnswers').replace('{count}', answers.length.toString())}
                </CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${answersOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="space-y-2 pt-0">
                {answers.map((answer, i) => (
                  <div key={i} className="p-3 rounded-md bg-muted">
                    <p className="text-sm">{answer}</p>
                  </div>
                ))}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Web Sources & Citations - Premium Glassmorphic Card */}
      {sources && sources.length > 0 && (
        <Card className="border-border/60 bg-background/50 backdrop-blur-md shadow-lg transition-all duration-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4 text-emerald-500 animate-spin-slow" />
              Web Sources & Citations
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col justify-between p-3 rounded-lg border border-border/40 bg-card/40 hover:bg-accent/40 hover:border-emerald-500/30 transition-all duration-300 shadow-sm hover:shadow"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                        [{i + 1}]
                      </span>
                      <h4 className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-emerald-500 transition-colors">
                        {src.title}
                      </h4>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                    </div>
                    {src.content && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {src.content}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/70 truncate">
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{src.url}</span>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Answer Section - Always Open */}
      {finalAnswer && (
        <Card className="border-primary bg-background/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              {t('common.finalAnswer')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FinalAnswerContent
              content={finalAnswer}
              onReferenceClick={handleReferenceClick}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading Indicator */}
      {isStreaming && !finalAnswer && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoadingSpinner size="sm" />
          <span>{t('searchPage.processingQuestion')}</span>
        </div>
      )}
    </div>
  )
}

// Helper component to render final answer with clickable references
function FinalAnswerContent({
  content,
  onReferenceClick
}: {
  content: string
  onReferenceClick: (type: string, id: string) => void
}) {
  // Convert references to markdown links
  const markdownWithLinks = convertReferencesToMarkdownLinks(content)

  // Create custom link component
  const LinkComponent = createReferenceLinkComponent(onReferenceClick)

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert break-words prose-a:break-all prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: LinkComponent,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse border border-border">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-border">{children}</tr>,
          th: ({ children }) => <th className="border border-border px-3 py-2 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-border px-3 py-2">{children}</td>,
        }}
      >
        {markdownWithLinks}
      </ReactMarkdown>
    </div>
  )
}
