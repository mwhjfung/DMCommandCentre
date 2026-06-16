import type {
  TranscriptionProvider,
  TranscriptionEvents,
  TranscriptionError
} from './types'
import type { SpeechRecognitionLike } from './webspeech-types'

/**
 * Browser-native transcription via webkitSpeechRecognition. Zero setup, but in
 * packaged Electron the bundled Chromium often lacks the Google speech backend
 * and fails with a 'network' error — which is exactly why this sits behind the
 * TranscriptionProvider interface, so Whisper can be swapped in.
 */
export class WebSpeechProvider implements TranscriptionProvider {
  readonly name = 'Web Speech API'
  private recognition: SpeechRecognitionLike | null = null
  private manualStop = false
  private hadFatalError = false

  isSupported(): boolean {
    return typeof (window.SpeechRecognition || window.webkitSpeechRecognition) === 'function'
  }

  async start(events: TranscriptionEvents): Promise<void> {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) {
      this.fail(events, {
        code: 'unsupported',
        message: 'The Web Speech API is not available in this runtime.',
        fatal: true
      })
      return
    }

    events.onStatus?.('starting')
    this.manualStop = false
    this.hadFatalError = false

    // Ask for the mic explicitly first, so the OS permission prompt fires and we
    // get a clean signal if it's denied, before recognition muddies the water.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      this.fail(events, {
        code: 'not-allowed',
        message: 'Microphone permission was denied or no microphone is available.',
        fatal: true
      })
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => events.onStatus?.('listening')

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          const trimmed = transcript.trim()
          if (trimmed) events.onFinal?.(trimmed)
        } else {
          interim += transcript
        }
      }
      const trimmedInterim = interim.trim()
      if (trimmedInterim) events.onPartial?.(trimmedInterim)
    }

    recognition.onerror = (event) => {
      const code = event.error || 'unknown'
      const fatal = ['network', 'not-allowed', 'service-not-allowed', 'audio-capture'].includes(
        code
      )
      if (fatal) this.hadFatalError = true
      events.onError?.({ code, message: describeError(code), fatal })
      if (fatal) events.onStatus?.('error')
    }

    recognition.onend = () => {
      // Continuous recognition can stop itself; restart unless we stopped it or
      // a fatal error already killed it (avoids a tight error-restart loop).
      if (!this.manualStop && !this.hadFatalError) {
        try {
          recognition.start()
        } catch {
          /* already started or shutting down — ignore */
        }
      } else if (this.manualStop) {
        events.onStatus?.('stopped')
      }
    }

    this.recognition = recognition
    try {
      recognition.start()
    } catch (err) {
      this.fail(events, { code: 'start-failed', message: String(err), fatal: true })
    }
  }

  stop(): void {
    this.manualStop = true
    this.recognition?.stop()
  }

  private fail(events: TranscriptionEvents, error: TranscriptionError): void {
    this.hadFatalError = true
    events.onError?.(error)
    events.onStatus?.('error')
  }
}

function describeError(code: string): string {
  switch (code) {
    case 'network':
      return "The speech-recognition service couldn't be reached. In packaged Electron this usually means Web Speech is unavailable — use the Whisper provider instead."
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone or speech-recognition permission was denied.'
    case 'audio-capture':
      return 'No microphone was found.'
    case 'no-speech':
      return 'No speech was detected.'
    case 'aborted':
      return 'Recognition was aborted.'
    default:
      return `Recognition error: ${code}`
  }
}
