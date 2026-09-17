import { describe, expect, it } from 'vitest'
import {
  coronaryFromDevice,
  formatGuideLabel,
  parseGuideLabel,
  withGuideDevice,
} from '@/lib/guideCatheter'

describe('guideCatheter', () => {
  it('splits JR 3.5 into device JR and curve 3.5', () => {
    expect(parseGuideLabel('JR 3.5')).toEqual({ device: 'JR', curve: '3.5' })
    expect(parseGuideLabel('JR4')).toEqual({ device: 'JR', curve: '4.0' })
    expect(formatGuideLabel({ device: 'JR', curve: '3.5' })).toBe('JR 3.5')
  })

  it('keeps EBU and XB as their own devices', () => {
    expect(parseGuideLabel('EBU 3.5')).toEqual({ device: 'EBU', curve: '3.5' })
    expect(formatGuideLabel({ device: 'XB', curve: '3.75' })).toBe('XB 3.75')
  })

  it('maps Amplatz codes to AL/AR devices', () => {
    expect(parseGuideLabel('AL2')).toEqual({ device: 'AL', curve: '2' })
    expect(formatGuideLabel({ device: 'AR', curve: '1' })).toBe('AR1')
  })

  it('infers coronary from the device letters', () => {
    expect(coronaryFromDevice('JR')).toBe('right')
    expect(coronaryFromDevice('EBU')).toBe('left')
    expect(coronaryFromDevice('AL')).toBe('left')
  })

  it('keeps a compatible curve when the device changes', () => {
    expect(withGuideDevice({ device: 'JR', curve: '3.5' }, 'EBU')).toEqual({
      device: 'EBU',
      curve: '3.5',
    })
  })
})
