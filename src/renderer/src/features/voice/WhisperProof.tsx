import { useRef, useState } from 'react'
import { Mic, Square, AlertTriangle, CheckCircle2, Cpu, Loader2 } from 'lucide-react'
import { blobToMono16kHz } from '@/lib/voice/audio'
import {
  loadWhisper,
  transcribeSamples,
  getWhisperDevice,
  DEFAULT_WHISPER_MODEL,
  type WhisperProgress
} from '@/lib/voice/whisperEngine'
import { cn } from '@/lib/cn'

type Phase = 'idle' | 'recording' | 'loading' | 'transcribing' | 'error'

interface Timing {
  audioSec: number
  inferMs: number
  device: string
}

/**
 * Temporary harness for Task #2b — proving in-app Whisper actually transcribes
 * inside Electron, and how fast/accurate it is. Replaced by the real Voice
 * module once the keyword feed is built.
 */
export function WhisperProof(): JSX.Element {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progressPct, setProgressPct] = useState<number | null>(null)
  const [progressLabel, setProgressLabel] = useState('')
  const [transcript, setTranscript] = useState('')
  const [timing, setTiming] = useState<Timing | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const modelLoadedRef = useRef(false)

  const startRecording = async (): Promise<void> => {
    setErrorMsg(null)
    setTranscript('')
    setTiming(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        void handleAudio(blob)
      }
      recorderRef.current = recorder
      recorder.start()
      setPhase('recording')
    } catch {
      setErrorMsg('Microphone permission was denied or no microphone is available.')
      setPhase('error')
    }
  }

  const stopRecording = (): void => {
    recorderRef.current?.stop()
  }

  const handleAudio = async (blob: Blob): Promise<void> => {
    try {
      const samples = await blobToMono16kHz(blob)
      const audioSec = samples.length / 16000

      if (!modelLoadedRef.current) {
        setPhase('loading')
        setProgressPct(null)
        await loadWhisper(DEFAULT_WHISPER_MODEL, (p: WhisperProgress) => {
          const pct = p.progress ?? (p.total ? ((p.loaded ?? 0) / p.total) * 100 : null)
          setProgressPct(pct != null ? Math.round(pct) : null)
          setProgressLabel(p.file ? `${p.status} ${p.file}` : p.status)
        })
        modelLoadedRef.current = true
      }

      setPhase('transcribing')
      const t0 = performance.now()
      const text = await transcribeSamples(samples)
      const inferMs = performance.now() - t0

      setTranscript(text || '(nothing recognised)')
      setTiming({ audioSec, inferMs, device: getWhisperDevice() })
      setPhase('idle')
    } catch (err) {
      setErrorMsg(String(err))
      setPhase('error')
    }
  }

  const recording = phase === 'recording'
  const busy = phase === 'loading' || phase === 'transcribing'
  const ratio = timing ? timing.inferMs / (timing.audioSec * 1000) : null

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="panel p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-accent" />
              <h2 className="text-sm font-semibold text-ink">In-app Whisper check</h2>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Click <span className="text-ink">Record</span>, allow the mic, and say something with
              D&amp;D names in it — e.g.{' '}
              <span className="text-ink">&ldquo;I cast Eldritch Blast at the Beholder&rdquo;</span>.
              Then Stop. Everything runs locally; the first run downloads the model.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          {!recording ? (
            <button
              type="button"
              className="btn-accent"
              disabled={busy}
              onClick={startRecording}
            >
              <Mic size={16} />
              Record
            </button>
          ) : (
            <button type="button" className="btn-danger" onClick={stopRecording}>
              <Square size={16} />
              Stop &amp; transcribe
            </button>
          )}
          {busy && (
            <span className="flex items-center gap-2 text-xs text-ink-muted">
              <Loader2 size={14} className="animate-spin" />
              {phase === 'loading'
                ? `Downloading model (one-time)${progressPct != null ? ` — ${progressPct}%` : '…'}`
                : 'Transcribing locally…'}
            </span>
          )}
          {recording && (
            <span className="flex items-center gap-2 text-xs text-danger">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
              Recording
            </span>
          )}
        </div>

        {phase === 'loading' && progressPct != null && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full bg-accent transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-1 truncate text-[11px] text-ink-muted">{progressLabel}</p>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}
      </div>

      <div className="panel p-5">
        <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Transcript</h3>
        <div className="mt-3 min-h-[5rem] text-[15px] leading-relaxed">
          {transcript ? (
            <p className="text-ink">{transcript}</p>
          ) : (
            <p className="text-ink-muted">Nothing yet — record something above.</p>
          )}
        </div>
        {timing && (
          <p className="mt-3 border-t border-border pt-3 text-xs text-ink-muted">
            Transcribed {timing.audioSec.toFixed(1)}s of audio in {Math.round(timing.inferMs)}ms on{' '}
            <span className="text-ink">{timing.device}</span>
            {ratio != null && (
              <>
                {' '}
                ({ratio < 1 ? `${(1 / ratio).toFixed(1)}× faster than real-time` : `${ratio.toFixed(1)}× real-time`})
              </>
            )}
          </p>
        )}
      </div>

      {transcript && phase === 'idle' && !errorMsg && (
        <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 size={16} />
          In-app Whisper works in Electron — check the wording above, then we build the keyword feed
          on it.
        </div>
      )}
    </div>
  )
}
