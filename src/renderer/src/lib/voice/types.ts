export type TranscriptionStatus = 'idle' | 'starting' | 'listening' | 'stopped' | 'error'

export interface TranscriptionError {
  /** Raw error code, e.g. 'network', 'not-allowed', 'unsupported'. */
  code: string
  message: string
  /** Fatal errors mean the provider has stopped and won't recover on its own. */
  fatal: boolean
}

export interface TranscriptionEvents {
  onPartial?: (text: string) => void
  onFinal?: (text: string) => void
  onStatus?: (status: TranscriptionStatus) => void
  onError?: (error: TranscriptionError) => void
}

/**
 * The single contract every transcription backend implements. The rest of the
 * app talks to this interface and never knows whether Web Speech or Whisper is
 * running underneath. See docs/DESIGN.md "The voice pipeline".
 */
export interface TranscriptionProvider {
  readonly name: string
  isSupported(): boolean
  start(events: TranscriptionEvents): Promise<void>
  stop(): void
}
