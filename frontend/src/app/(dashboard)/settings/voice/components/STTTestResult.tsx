'use client'

interface STTTestResultProps {
  result: string
}

/**
 * Displays the STT transcription test result.
 * Extracted to eliminate duplicate rendering blocks across engine sections.
 */
export function STTTestResult({ result }: STTTestResultProps) {
  if (!result) return null
  return (
    <div className="p-2.5 bg-sidebar-accent/20 rounded-md text-xs" role="status" aria-live="polite">
      <p className="font-medium text-[10px] text-muted-foreground mb-1">Result:</p>
      <p>{result}</p>
    </div>
  )
}
