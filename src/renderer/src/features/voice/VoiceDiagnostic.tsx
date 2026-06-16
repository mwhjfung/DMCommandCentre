import { useMemo, useRef, useState } from 'react'
import { Mic, Square, AlertTriangle, CheckCircle2, Radio } from 'lucide-react'
import { WebSpeechProvider } from '@/lib/voice/webSpeechProvider'
import type {
  TranscriptionProvider,
  TranscriptionStatus,
  TranscriptionError
} from '@/lib/voice/types'
import { cn } from '@/lib/cn'

/**
 * Temporary harness for Task #2 — proving Web Speech transcription works inside
 * Electron before the real Voice module is built. Remove once voice is wired in.
 */
export function VoiceDiagnostic(): JSX.Element {
  const providerRef = useRef<TranscriptionProvider>(new WebSpeechProvider())
  const [status, setStatus] = useState<TranscriptionStatus>('idle')
  const [partial, setPartial] = useState('')
  const [finals, setFinals] = useState<string[]>([])
  const [error, setError] = useState<TranscriptionError | null>(null)

  const supported = useMemo(() => providerRef.current.isSupported(), [])
  const listening = status === 'listening' || status === 'starting'

  const start = async (): Promise<void> => {
    setError(null)
    setPartial('')
    setFinals([])
    await providerRef.current.start({
      onStatus: setStatus,
      onPartial: setPartial,
      onFinal: (text) => {
        setPartial('')
        setFinals((prev) => [...prev, text])
      },
      onError: setError
    })
  }

  const stop = (): void => {
    providerRef.current.stop()
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-accent" />
              <h2 className="text-sm font-semibold text-ink">Voice transcription check</h2>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Click <span className="text-ink">Listen</span>, allow the mic if macOS asks, and
              talk for a few seconds. We&apos;re confirming Web Speech actually transcribes inside
              Electron.
            </p>
          </div>
          <StatusBadge supported={supported} status={status} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          {!listening ? (
            <button type="button" className="btn-accent" disabled={!supported} onClick={start}>
              <Mic size={16} />
              Listen
            </button>
          ) : (
            <button type="button" className="btn-danger" onClick={stop}>
              <Square size={16} />
              Stop
            </button>
          )}
          <span className="text-xs text-ink-muted">
            Provider: {providerRef.current.name}
          </span>
        </div>

        {error && (
          <div
            className={cn(
              'mt-4 flex items-start gap-2 rounded-md border p-3 text-sm',
              error.fatal
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-border bg-surface-2 text-ink-muted'
            )}
          >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                {error.code}
                {error.fatal ? ' (fatal)' : ''}
              </p>
              <p className="mt-0.5">{error.message}</p>
            </div>
          </div>
        )}
      </div>

      <div className="panel p-5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Transcript</h3>
        <div className="mt-3 min-h-[7rem] space-y-1 text-[15px] leading-relaxed">
          {finals.length === 0 && !partial && (
            <p className="text-ink-muted">Nothing yet — your words will appear here.</p>
          )}
          {finals.map((line, i) => (
            <p key={i} className="text-ink">
              {line}
            </p>
          ))}
          {partial && <p className="italic text-ink-muted">{partial}</p>}
        </div>
      </div>

      {finals.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 size={16} />
          Web Speech is working in Electron — we can build the keyword feed on it.
        </div>
      )}
    </div>
  )
}

function StatusBadge({
  supported,
  status
}: {
  supported: boolean
  status: TranscriptionStatus
}): JSX.Element {
  if (!supported) {
    return (
      <span className="chip border-danger/40 text-danger">API unavailable</span>
    )
  }
  const map: Record<TranscriptionStatus, string> = {
    idle: 'Ready',
    starting: 'Starting…',
    listening: 'Listening',
    stopped: 'Stopped',
    error: 'Error'
  }
  return (
    <span
      className={cn(
        'chip',
        status === 'listening' && 'border-accent/50 text-accent',
        status === 'error' && 'border-danger/40 text-danger'
      )}
    >
      {status === 'listening' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
      {map[status]}
    </span>
  )
}
