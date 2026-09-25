const STORAGE_KEY = 'cathnote.llm'

export const DEFAULT_LLM_MODEL = 'gpt-4o-mini'
export const LLM_CHAT_PATH = '/openai/v1/chat/completions'

export type LlmSettings = {
  apiKey: string
  model: string
}

export const defaultLlmSettings = (): LlmSettings => ({
  apiKey: '',
  model: DEFAULT_LLM_MODEL,
})

export function loadLlmSettings(): LlmSettings {
  const base = defaultLlmSettings()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<LlmSettings>
    return {
      apiKey: String(parsed.apiKey ?? '').trim(),
      model: String(parsed.model ?? '').trim() || DEFAULT_LLM_MODEL,
    }
  } catch {
    return base
  }
}

export function saveLlmSettings(settings: LlmSettings): LlmSettings {
  const next: LlmSettings = {
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim() || DEFAULT_LLM_MODEL,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function hasLlmKey(settings: LlmSettings = loadLlmSettings()): boolean {
  return Boolean(settings.apiKey)
}
