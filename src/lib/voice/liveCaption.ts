type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionResultEvent = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0?: { transcript?: string }
  }>
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export type LiveCaptionHandle = {
  stop: () => void
}

function speechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export function hasLiveCaptionSupport(): boolean {
  return Boolean(speechRecognitionCtor())
}

export function formatLiveCaption(
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>,
  resultIndex: number,
  priorFinals: string[],
): { finals: string[]; display: string } {
  const finals = [...priorFinals]
  let interim = ''
  for (let i = resultIndex; i < results.length; i++) {
    const piece = results[i]?.[0]?.transcript?.trim() ?? ''
    if (!piece) continue
    if (results[i].isFinal) finals.push(piece)
    else interim += (interim ? ' ' : '') + piece
  }
  return {
    finals,
    display: [...finals, interim].filter(Boolean).join(' ').trim(),
  }
}

export function startLiveCaption(onText: (text: string) => void): LiveCaptionHandle | null {
  const Ctor = speechRecognitionCtor()
  if (!Ctor) return null

  const rec = new Ctor()
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1
  rec.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-IN'

  let stopped = false
  let finals: string[] = []

  rec.onresult = (event) => {
    const next = formatLiveCaption(event.results, event.resultIndex, finals)
    finals = next.finals
    onText(next.display)
  }
  rec.onerror = () => {
    /* Preview only. Recording for Scribe continues. */
  }
  rec.onend = () => {
    if (stopped) return
    try {
      rec.start()
    } catch {
      /* already running or unsupported */
    }
  }

  try {
    rec.start()
  } catch {
    return null
  }

  return {
    stop: () => {
      stopped = true
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      try {
        rec.abort()
      } catch {
        try {
          rec.stop()
        } catch {
          /* ignore */
        }
      }
    },
  }
}
