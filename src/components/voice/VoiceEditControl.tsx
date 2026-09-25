import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LoaderCircle, Mic, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hasElevenLabsKey, loadElevenLabsSettings } from '@/lib/elevenLabsSettings'
import { pickRecorderMimeType, transcribeAudio } from '@/lib/elevenLabsStt'
import { hasLlmKey, loadLlmSettings } from '@/lib/llmSettings'
import { applyVoiceActions } from '@/lib/voice/apply'
import { interpretTranscript } from '@/lib/voice/interpret'
import { startLiveCaption, type LiveCaptionHandle } from '@/lib/voice/liveCaption'
import type { VoiceAction, VoiceDecision, VoiceOption } from '@/lib/voice/schema'
import { useCatalogueStore } from '@/store/useCatalogueStore'
import { useProcedureStore } from '@/store/useProcedureStore'
import { logFromDecision, useVoiceLogStore } from '@/store/useVoiceLogStore'
import type { Procedure } from '@/types/procedure'
import { cn } from '@/lib/utils'

type VoiceStatus = 'idle' | 'recording' | 'working'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.closest('input, textarea, select, [contenteditable="true"]')) return true
  if (target.closest('[role="textbox"], [role="combobox"], [role="searchbox"]')) return true
  if (document.querySelector('[data-sheet]')) return true
  return false
}

export function VoiceEditControl() {
  const current = useProcedureStore((s) => s.current)
  const mutate = useProcedureStore((s) => s.mutate)
  const remember = useCatalogueStore((s) => s.remember)
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [phase, setPhase] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [decision, setDecision] = useState<VoiceDecision | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  const [livePreview, setLivePreview] = useState('')
  const [liveCaptionOn, setLiveCaptionOn] = useState(false)
  const undoRef = useRef<Procedure | null>(null)
  const logIdRef = useRef<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const stopTimerRef = useRef<number | null>(null)
  const liveCaptionRef = useRef<LiveCaptionHandle | null>(null)
  const statusRef = useRef<VoiceStatus>(status)
  const modalOpenRef = useRef(false)
  const onMicClickRef = useRef<() => void>(() => {})

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }

  useEffect(() => {
    if (status !== 'recording') return
    const started = Date.now()
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250)
    return () => window.clearInterval(id)
  }, [status])

  useEffect(() => {
    return () => {
      liveCaptionRef.current?.stop()
      liveCaptionRef.current = null
      stopTracks()
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current)
    }
  }, [])

  const closeModal = () => {
    setTranscript(null)
    setDecision(null)
    setError(null)
    setApplied(false)
    undoRef.current = null
    logIdRef.current = null
  }

  const haltLiveCaption = () => {
    liveCaptionRef.current?.stop()
    liveCaptionRef.current = null
    setLiveCaptionOn(false)
  }

  const finishRecording = () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    haltLiveCaption()
    recorder.stop()
  }

  const startRecording = async () => {
    setError(null)
    setTranscript(null)
    setDecision(null)
    setApplied(false)
    setLivePreview('')
    setLiveCaptionOn(false)
    if (!hasElevenLabsKey()) {
      setError('Add an ElevenLabs API key in Settings to use voice edit.')
      return
    }
    if (!hasLlmKey()) {
      setError('Add an OpenAI API key in Settings so voice can map onto the report.')
      return
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot record audio.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickRecorderMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        haltLiveCaption()
        stopTracks()
        setStatus('idle')
        setError('Recording failed.')
      }
      recorder.onstop = () => {
        haltLiveCaption()
        const type = recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        stopTracks()
        void runPipeline(blob)
      }
      recorderRef.current = recorder
      recorder.start()
      setSeconds(0)
      setStatus('recording')
      const caption = startLiveCaption((text) => setLivePreview(text))
      liveCaptionRef.current = caption
      setLiveCaptionOn(Boolean(caption))
      stopTimerRef.current = window.setTimeout(finishRecording, 90_000)
    } catch {
      haltLiveCaption()
      stopTracks()
      setError('Microphone permission is required for voice edit.')
    }
  }

  const rememberNewDevices = (before: Procedure, after: Procedure) => {
    const prev = new Set(before.events.map((e) => e.id))
    for (const event of after.events) {
      if (prev.has(event.id)) continue
      if (event.kind === 'stent') void remember('stent', event.data.name, { type: event.data.type })
      if (event.kind === 'predilatation' || event.kind === 'postdilatation' || event.kind === 'lmcaPot') {
        void remember('balloon', event.data.name, { type: event.data.type })
      }
      if (event.kind === 'guidewire') void remember('wire', event.data.name)
    }
  }

  const commitActions = (actions: VoiceAction[]) => {
    const procedure = useProcedureStore.getState().current
    if (!procedure || !actions.length) return
    undoRef.current = procedure
    const next = applyVoiceActions(procedure, actions, useCatalogueStore.getState().items)
    mutate(() => next)
    rememberNewDevices(procedure, next)
    setApplied(true)
  }

  const applyDecision = (next: VoiceDecision, spoken: string) => {
    const procedure = useProcedureStore.getState().current
    setDecision(next)
    if (procedure) {
      logIdRef.current = logFromDecision(procedure.id, spoken, next)
    }
    if (next.status === 'apply') commitActions(next.actions)
  }

  const runPipeline = async (blob: Blob) => {
    const procedure = useProcedureStore.getState().current
    if (!procedure) {
      setError('Open a procedure first.')
      setStatus('idle')
      return
    }
    setStatus('working')
    setPhase('Transcribing')
    let spoken = ''
    try {
      spoken = await transcribeAudio(blob, loadElevenLabsSettings().apiKey)
      setTranscript(spoken)
      setPhase('Understanding')
      const llm = loadLlmSettings()
      const next = await interpretTranscript({
        transcript: spoken,
        procedure,
        catalogue: useCatalogueStore.getState().items,
        apiKey: llm.apiKey,
        model: llm.model,
      })
      applyDecision(next, spoken)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Voice edit failed.'
      setError(message)
      logIdRef.current = useVoiceLogStore.getState().record({
        procedureId: procedure.id,
        transcript: spoken,
        status: 'error',
        summary: message,
        actions: [],
        error: message,
      })
    } finally {
      setStatus('idle')
      setPhase('')
    }
  }

  const onMicClick = () => {
    if (status === 'working') return
    if (status === 'recording') {
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current)
      finishRecording()
      return
    }
    void startRecording()
  }

  statusRef.current = status
  modalOpenRef.current = Boolean(transcript || error || decision)
  onMicClickRef.current = onMicClick

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return
      if (e.defaultPrevented || e.repeat || e.isComposing) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (statusRef.current === 'working') return
      if (modalOpenRef.current && statusRef.current !== 'recording') return
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      onMicClickRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const undo = () => {
    const previous = undoRef.current
    if (!previous) return
    mutate(() => previous)
    if (logIdRef.current) useVoiceLogStore.getState().markUndone(logIdRef.current)
    undoRef.current = null
    logIdRef.current = null
    setApplied(false)
  }

  const pickOption = (option: VoiceOption) => {
    applyDecision({ status: 'apply', summary: option.summary, actions: option.actions }, transcript ?? '')
  }

  const modalOpen = Boolean(transcript || error || decision)
  if (!current) return null

  return (
    <>
      <button
        type="button"
        className={cn(
          'no-print fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 flex size-14 items-center justify-center rounded-full shadow-card lg:right-8',
          status === 'recording' ? 'bg-danger text-white' : 'bg-accent text-accent-fg',
          status === 'working' && 'opacity-80',
        )}
        onClick={onMicClick}
        disabled={status === 'working'}
        aria-label={status === 'recording' ? 'Stop recording' : 'Voice edit'}
        title={status === 'recording' ? 'Stop and transcribe (Space)' : 'Voice edit (Space)'}
      >
        {status === 'working' ? (
          <LoaderCircle className="size-6 animate-spin" />
        ) : status === 'recording' ? (
          <Square className="size-5 fill-current" />
        ) : (
          <Mic className="size-6" />
        )}
      </button>
      {status === 'recording' || status === 'working' ? (
        <div className="no-print pointer-events-none fixed bottom-[max(5.25rem,calc(env(safe-area-inset-bottom)+4rem))] right-4 z-40 flex w-[min(24rem,calc(100vw-6.5rem))] flex-col items-end gap-2 lg:right-8">
          {status === 'recording' && (liveCaptionOn || livePreview) ? (
            <div
              className="w-full rounded-2xl border border-border bg-surface px-3 py-2 shadow-card"
              aria-live="polite"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Hearing preview</p>
              <p className="mt-1 text-sm leading-relaxed">
                {livePreview || 'Listening…'}
              </p>
            </div>
          ) : null}
          <p className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-danger shadow-card">
            {status === 'recording' ? `Recording ${seconds}s · Space to stop` : phase || 'Working'}
          </p>
        </div>
      ) : null}
      {modalOpen
        ? createPortal(
            <div className="no-print fixed inset-0 z-[80] flex items-center justify-center p-4">
              <button type="button" aria-label="Close" className="absolute inset-0 bg-[#10172a]/35" onClick={closeModal} />
              <div
                role="dialog"
                aria-labelledby="voice-edit-title"
                className="relative w-full max-w-md rounded-3xl border border-border bg-surface p-4 shadow-card"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 id="voice-edit-title" className="text-base font-semibold">
                    {error ? 'Voice edit' : decision?.status === 'clarify' ? 'Which did you mean?' : 'Voice edit'}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={closeModal} aria-label="Close">
                    <X className="size-5" />
                  </Button>
                </div>
                {transcript ? (
                  <p className="mb-3 rounded-2xl bg-background px-3 py-2 text-sm leading-relaxed text-muted">
                    “{transcript}”
                  </p>
                ) : null}
                {error ? <p className="text-sm leading-relaxed text-danger">{error}</p> : null}
                {!error && decision?.status === 'apply' ? (
                  <p className="text-sm leading-relaxed">{decision.summary}</p>
                ) : null}
                {!error && decision?.status === 'none' ? (
                  <p className="text-sm leading-relaxed">{decision.reason}</p>
                ) : null}
                {!error && decision?.status === 'clarify' ? (
                  <div className="space-y-2">
                    <p className="text-sm leading-relaxed">{decision.question}</p>
                    {decision.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className="w-full rounded-2xl border border-border bg-card px-3 py-3 text-left text-sm font-semibold hover:bg-accent-soft"
                        onClick={() => pickOption(option)}
                      >
                        <span className="block">{option.label}</span>
                        <span className="mt-0.5 block text-xs font-normal text-muted">{option.summary}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex justify-end gap-2">
                  {applied && undoRef.current ? (
                    <Button variant="secondary" size="sm" onClick={undo}>
                      Undo
                    </Button>
                  ) : null}
                  <Button variant={applied ? 'default' : 'secondary'} size="sm" onClick={closeModal}>
                    {applied ? 'Done' : 'Close'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
