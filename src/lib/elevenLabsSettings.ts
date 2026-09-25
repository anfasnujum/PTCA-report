const STORAGE_KEY = 'cathnote.elevenlabs'

export type ElevenLabsSettings = {
  apiKey: string
}

export const defaultElevenLabsSettings = (): ElevenLabsSettings => ({
  apiKey: '',
})

export function loadElevenLabsSettings(): ElevenLabsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultElevenLabsSettings()
    const parsed = JSON.parse(raw) as Partial<ElevenLabsSettings>
    return { apiKey: String(parsed.apiKey ?? '').trim() }
  } catch {
    return defaultElevenLabsSettings()
  }
}

export function saveElevenLabsSettings(settings: ElevenLabsSettings): ElevenLabsSettings {
  const next: ElevenLabsSettings = { apiKey: settings.apiKey.trim() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function hasElevenLabsKey(settings: ElevenLabsSettings = loadElevenLabsSettings()): boolean {
  return Boolean(settings.apiKey)
}
