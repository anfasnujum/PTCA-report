import { describe, expect, it } from 'vitest'
import { accessNarrative, accessSpecialNoteLine, defaultCatheterSize, formatAorticPressureInput, formatCatheterLabel, formatContrastLabel, formatLabAccess, parseCatheterLabel, parseContrastLabel, presetSheathsForSite, sheathAccessGroup, sheathAllowedForSite, sheathsForSite } from '@/lib/access'

describe('access helpers', () => {
  it('lists radial vs femoral sheaths', () => {
    expect(sheathAccessGroup('radial')).toBe('radial')
    expect(sheathAccessGroup('distal radial')).toBe('radial')
    expect(sheathAccessGroup('ulnar')).toBe('radial')
    expect(sheathAccessGroup('femoral')).toBe('femoral')
    expect(sheathAccessGroup('brachial')).toBe('femoral')
    expect(presetSheathsForSite('radial')).toEqual(['Radifocus Terumo', 'Glidesheath Slender', 'Prelude Ease'])
    expect(presetSheathsForSite('femoral')).toEqual(['Radifocus Terumo', 'Avanti+', 'Input', 'Terumo Introducer'])
    expect(sheathsForSite('radial')).not.toContain('Avanti+')
    expect(sheathsForSite('femoral')).not.toContain('Glidesheath Slender')
    expect(sheathsForSite('radial')).toContain('Radifocus Terumo')
    expect(sheathsForSite('femoral')).toContain('Radifocus Terumo')
    expect(
      sheathsForSite('radial', [{ category: 'sheath', name: 'Cook Radial', meta: { accessGroup: 'radial' } }]),
    ).toContain('Cook Radial')
    expect(sheathAllowedForSite('Avanti+', 'radial')).toBe(false)
    expect(sheathAllowedForSite('Avanti+', 'femoral')).toBe(true)
  })

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
    ).toBe('Right ulnar artery; 5F sheath inserted.')
    expect(
      accessNarrative(
        {
          site: 'radial',
          side: 'right',
          sheathSize: '6F',
          punctures: 1,
          singleAttempt: true,
          specialNote: '',
          specialNoteCustom: '',
        },
        { includeSheath: false },
      ),
    ).toBe('Right radial artery.')
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

  it('inserts a slash after the third aortic-pressure digit', () => {
    expect(formatAorticPressureInput('12')).toBe('12')
    expect(formatAorticPressureInput('120')).toBe('120')
    expect(formatAorticPressureInput('1208')).toBe('120/8')
    expect(formatAorticPressureInput('12080')).toBe('120/80')
    expect(formatAorticPressureInput('120/80')).toBe('120/80')
    expect(formatAorticPressureInput('120/801')).toBe('120/801')
  })
})
