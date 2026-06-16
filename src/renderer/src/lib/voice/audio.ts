/**
 * Decode a recorded audio blob into 16 kHz mono Float32 PCM — the format
 * Whisper expects. Uses an OfflineAudioContext to downmix and resample.
 */
export async function blobToMono16kHz(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer()
  const decodeCtx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer)
  } finally {
    void decodeCtx.close()
  }

  const targetRate = 16000
  const frameCount = Math.max(1, Math.ceil(decoded.duration * targetRate))
  const offline = new OfflineAudioContext(1, frameCount, targetRate)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0).slice()
}

/** Concatenate accumulated PCM frames into one Float32Array. */
export function mergeFloat32(chunks: Float32Array[], total: number): Float32Array {
  const out = new Float32Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

/** Linear-interpolation resample. Good enough for speech going into Whisper. */
export function resampleLinear(input: Float32Array, fromRate: number, toRate = 16000): Float32Array {
  if (fromRate === toRate) return input
  const ratio = toRate / fromRate
  const outLen = Math.round(input.length * ratio)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i += 1) {
    const srcPos = i / ratio
    const i0 = Math.floor(srcPos)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const frac = srcPos - i0
    out[i] = input[i0] * (1 - frac) + input[i1] * frac
  }
  return out
}
