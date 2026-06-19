import { mergeFloat32, resampleLinear } from './audio'

export interface CaptureCallbacks {
  /** A flushed utterance as 16 kHz mono Float32 PCM. */
  onChunk: (samples: Float32Array) => void
  onError: (message: string) => void
  onLevel?: (rms: number) => void
}

const FRAME_SIZE = 4096
const VOICE_RMS_THRESHOLD = 0.012
const SILENCE_FLUSH_SECONDS = 0.3
const MIN_UTTERANCE_SECONDS = 0.5
const MAX_UTTERANCE_SECONDS = 12
const MAX_SILENCE_BUFFER_SECONDS = 2.5

/**
 * Captures the microphone and emits natural utterance chunks: it accumulates
 * audio and flushes when speech is followed by a short pause (simple energy-based
 * VAD), or when a hard length cap is hit. Chunks go to Whisper for transcription.
 *
 * Uses ScriptProcessorNode — deprecated but dependency-free and reliable in
 * Electron. Inference, not capture, is the heavy part, so the main-thread cost
 * here is negligible.
 */
export class CaptureEngine {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private sampleRate = 16000

  private buffer: Float32Array[] = []
  private bufferLen = 0
  private silenceFrames = 0
  private voicedFrames = 0

  async start(cb: CaptureCallbacks, deviceId?: string): Promise<void> {
    try {
      const audio: MediaTrackConstraints = {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      }
      if (deviceId) audio.deviceId = { ideal: deviceId }
      this.stream = await navigator.mediaDevices.getUserMedia({ audio })
    } catch {
      cb.onError('Microphone permission was denied or no microphone is available.')
      return
    }

    this.ctx = new AudioContext({ sampleRate: 16000 })
    this.sampleRate = this.ctx.sampleRate
    this.source = this.ctx.createMediaStreamSource(this.stream)
    this.processor = this.ctx.createScriptProcessor(FRAME_SIZE, 1, 1)
    this.processor.onaudioprocess = (e) => this.onAudio(e.inputBuffer.getChannelData(0), cb)
    this.source.connect(this.processor)
    // ScriptProcessor only fires when connected to a destination.
    this.processor.connect(this.ctx.destination)
  }

  private onAudio(input: Float32Array, cb: CaptureCallbacks): void {
    let sum = 0
    for (let i = 0; i < input.length; i += 1) sum += input[i] * input[i]
    const rms = Math.sqrt(sum / input.length)
    cb.onLevel?.(rms)

    const frameSeconds = input.length / this.sampleRate
    const voiced = rms > VOICE_RMS_THRESHOLD

    this.buffer.push(new Float32Array(input))
    this.bufferLen += input.length
    if (voiced) {
      this.voicedFrames += 1
      this.silenceFrames = 0
    } else {
      this.silenceFrames += 1
    }

    const totalSeconds = this.bufferLen / this.sampleRate
    const silenceSeconds = this.silenceFrames * frameSeconds
    const hasSpeech = this.voicedFrames >= 2

    if (
      (hasSpeech && silenceSeconds >= SILENCE_FLUSH_SECONDS && totalSeconds >= MIN_UTTERANCE_SECONDS) ||
      totalSeconds >= MAX_UTTERANCE_SECONDS
    ) {
      this.flush(cb)
    } else if (!hasSpeech && totalSeconds >= MAX_SILENCE_BUFFER_SECONDS) {
      // Drop buffered silence so memory doesn't grow during quiet stretches.
      this.reset()
    }
  }

  private flush(cb: CaptureCallbacks): void {
    if (this.bufferLen === 0) return
    const merged = mergeFloat32(this.buffer, this.bufferLen)
    this.reset()
    const samples =
      this.sampleRate === 16000 ? merged : resampleLinear(merged, this.sampleRate, 16000)
    cb.onChunk(samples)
  }

  private reset(): void {
    this.buffer = []
    this.bufferLen = 0
    this.silenceFrames = 0
    this.voicedFrames = 0
  }

  stop(): void {
    try {
      this.processor?.disconnect()
      this.source?.disconnect()
      void this.ctx?.close()
      this.stream?.getTracks().forEach((t) => t.stop())
    } catch {
      /* ignore teardown errors */
    }
    this.processor = null
    this.source = null
    this.ctx = null
    this.stream = null
    this.reset()
  }
}
