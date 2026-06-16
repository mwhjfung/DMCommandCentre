import { pipeline, env } from '@huggingface/transformers'

// Always fetch models from the Hugging Face hub (don't look for local files
// under the app origin, which 404 in dev and packaged builds alike).
env.allowLocalModels = false

export interface WhisperProgress {
  status: string
  file?: string
  progress?: number
  loaded?: number
  total?: number
}

/** Minimal callable shape of the ASR pipeline we actually use. */
type AsrPipeline = (
  audio: Float32Array | string,
  options?: Record<string, unknown>
) => Promise<{ text: string } | Array<{ text: string }>>

export type WhisperDevice = 'webgpu' | 'wasm'

export const DEFAULT_WHISPER_MODEL = 'Xenova/whisper-base.en'

let pipelinePromise: Promise<AsrPipeline> | null = null
let usedDevice: WhisperDevice = 'wasm'

function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu
}

async function build(
  model: string,
  onProgress?: (p: WhisperProgress) => void
): Promise<AsrPipeline> {
  const make = (device: WhisperDevice): Promise<unknown> =>
    pipeline('automatic-speech-recognition', model, {
      device,
      progress_callback: onProgress as unknown as undefined
    })

  if (hasWebGPU()) {
    try {
      const p = (await make('webgpu')) as AsrPipeline
      usedDevice = 'webgpu'
      return p
    } catch (err) {
      console.warn('[whisper] WebGPU unavailable, falling back to WASM', err)
    }
  }
  const p = (await make('wasm')) as AsrPipeline
  usedDevice = 'wasm'
  return p
}

/** Lazily load (and cache) the Whisper pipeline. */
export function loadWhisper(
  model: string = DEFAULT_WHISPER_MODEL,
  onProgress?: (p: WhisperProgress) => void
): Promise<AsrPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = build(model, onProgress)
  }
  return pipelinePromise
}

export function getWhisperDevice(): WhisperDevice {
  return usedDevice
}

/** Transcribe 16 kHz mono Float32 samples to text. */
export async function transcribeSamples(
  samples: Float32Array,
  onProgress?: (p: WhisperProgress) => void
): Promise<string> {
  const transcriber = await loadWhisper(DEFAULT_WHISPER_MODEL, onProgress)
  const output = await transcriber(samples)
  const text = Array.isArray(output) ? output.map((o) => o.text).join(' ') : output.text
  return (text ?? '').trim()
}
