import { describe, expect, it } from 'vitest'
import { accessNarrative, accessSpecialNoteLine, defaultCatheterSize, formatCatheterLabel, formatContrastLabel, formatLabAccess, parseCatheterLabel, parseContrastLabel } from '@/lib/access'

describe('access helpers', () => {
  it('formats site and side for lab access', () => {
    expect(formatLabAccess({ site: 'radial', side: 'right' })).toBe('Right radial')
    expect(formatLabAccess({ site: 'femoral', side: 'left' })).toBe('Left femoral')
    expect(formatLabAccess({ site: '', side: '' })).toBe('')
  })

  it('round-trips catheter size and curve', () => {
    expect(formatCatheterLabel('5F', 'TIG')).toBe('5F TIG')
    expect(parseCatheterLabel('5F TIG')).toEqual({ size: '5F', curve: 'TIG' })
    expect(parseCatheterLabel('JL 4')).toEqual({ size: '5F', curve: 'JL 4' })
  })

  it('defaults catheter size from the sheath when it is a diagnostic French size', () => {
    expect(defaultCatheterSize('6F')).toBe('6F')
    expect(defaultCatheterSize('7F')).toBe('5F')
  })

  it('narrates access from site, side, sheath and special notes', () => {
    expect(
      accessNarrative({
        site: 'ulnar',
        side: 'right',
        sheathSize: '5F',
        punctures: 1,
        singleAttempt: true,
        specialNote: 'Radial artery calcification',
        specialNoteCustom: '',
      }),
    ).toBe('Right ulnar artery accessed; 5F sheath inserted.')
    expect(
      accessSpecialNoteLine({
        site: 'ulnar',
        side: 'right',
        sheathSize: '5F',
        punctures: 1,
        singleAttempt: true,
        specialNote: 'Radial artery calcification',
        specialNoteCustom: '',
      }),
    ).toBe('Special Notes: Radial artery calcification')
  })

  it('formats and parses contrast agent plus volume', () => {
    expect(formatContrastLabel('Omnipaque', 60)).toBe('Omnipaque 60 mL')
    expect(parseContrastLabel('Omnipaque 60 mL')).toEqual({ agent: 'Omnipaque', volumeMl: 60 })
    expect(parseContrastLabel('60 ml Omnipaque')).toEqual({ agent: 'Omnipaque', volumeMl: 60 })
    expect(parseContrastLabel('Iohexol 40 mL')).toEqual({ agent: 'Omnipaque', volumeMl: 40 })
    expect(formatContrastLabel('', '')).toBe('')
  })
})
