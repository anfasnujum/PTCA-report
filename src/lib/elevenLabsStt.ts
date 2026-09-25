/** Batch Scribe v2 — cheapest ElevenLabs STT ($0.22 / audio hour vs $0.39 realtime). */
export const SCRIBE_MODEL_ID = 'scribe_v2'

export const STT_PATH = '/elevenlabs/v1/speech-to-text'

type SpeechToTextResponse = {
  text?: string
}

function detailMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null
  const detail = (payload as { detail?: unknown }).detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (detail && typeof detail === 'object') {
    const message = (detail as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return null
}

export function transcriptFromResponse(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Unexpected transcription response.')
  }
  const text = (payload as SpeechToTextResponse).text
  if (typeof text !== 'string') {
    throw new Error('Transcription did not include text.')
  }
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('No speech was recognised. Try again.')
  }
  return trimmed
}

export function filenameForAudio(blob: Blob): string {
  const type = blob.type.toLowerCase()
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'voice.m4a'
  if (type.includes('mpeg') || type.includes('mp3')) return 'voice.mp3'
  if (type.includes('ogg')) return 'voice.ogg'
  if (type.includes('wav')) return 'voice.wav'
  return 'voice.webm'
}

export async function transcribeAudio(blob: Blob, apiKey: string): Promise<string> {
  const key = apiKey.trim()
  if (!key) {
    throw new Error('Add an ElevenLabs API key in Settings first.')
  }
  if (blob.size < 1) {
    throw new Error('Recording was empty.')
  }

  const form = new FormData()
  form.append('file', blob, filenameForAudio(blob))
  form.append('model_id', SCRIBE_MODEL_ID)
  form.append('tag_audio_events', 'false')
  form.append('no_verbatim', 'true')

  const response = await fetch(STT_PATH, {
    method: 'POST',
    headers: { 'xi-api-key': key },
    body: form,
  })

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(detailMessage(payload) || `Transcription failed (${response.status}).`)
  }
  return transcriptFromResponse(payload)
}

export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined
  }
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}
