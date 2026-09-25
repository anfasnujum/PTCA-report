import { describe, expect, it } from 'vitest'
import { formatVoiceAction } from '@/lib/voice/logFormat'

describe('formatVoiceAction', () => {
  it('describes access, contrast, and findings', () => {
    expect(
      formatVoiceAction({
        op: 'patch_access',
        data: { sheathSize: '6F', sheathBrand: 'Prelude Ease' },
      }),
    ).toBe('Access · 6F Prelude Ease')
    expect(
      formatVoiceAction({
        op: 'patch_contrast',
        data: { agent: 'Omnipaque', volumeMl: 100 },
      }),
    ).toBe('Contrast · Omnipaque 100 mL')
    expect(
      formatVoiceAction({
        op: 'upsert_finding',
        vessel: 'RCA',
        data: { stenosis: 50, segment: 'proximal' },
      }),
    ).toBe('Finding · RCA · 50% · proximal')
  })
})
