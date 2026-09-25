import { describe, expect, it } from 'vitest'
import { formatLiveCaption, hasLiveCaptionSupport } from '@/lib/voice/liveCaption'

describe('liveCaption', () => {
  it('is unavailable in Node', () => {
    expect(hasLiveCaptionSupport()).toBe(false)
  })

  it('joins final and interim phrases for the preview line', () => {
    const first = formatLiveCaption(
      [{ isFinal: true, 0: { transcript: 'RCA 90 percent' } }, { isFinal: false, 0: { transcript: 'run through' } }],
      0,
      [],
    )
    expect(first.display).toBe('RCA 90 percent run through')
    const second = formatLiveCaption([{ isFinal: true, 0: { transcript: 'floppy' } }], 0, first.finals)
    expect(second.display).toBe('RCA 90 percent floppy')
  })
})
