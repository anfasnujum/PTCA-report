import { describe, expect, it } from 'vitest'
import { filenameForAudio, transcriptFromResponse } from '@/lib/elevenLabsStt'

describe('transcriptFromResponse', () => {
  it('returns trimmed transcript text', () => {
    expect(transcriptFromResponse({ text: '  stent to LAD  ' })).toBe('stent to LAD')
  })

  it('rejects empty or missing text', () => {
    expect(() => transcriptFromResponse({ text: '   ' })).toThrow(/No speech/)
    expect(() => transcriptFromResponse({})).toThrow(/did not include text/)
  })
})

describe('filenameForAudio', () => {
  it('picks an extension from the blob type', () => {
    expect(filenameForAudio(new Blob([], { type: 'audio/webm;codecs=opus' }))).toBe('voice.webm')
    expect(filenameForAudio(new Blob([], { type: 'audio/mp4' }))).toBe('voice.m4a')
  })
})
