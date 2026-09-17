import { describe, expect, it } from 'vitest'
import {
  defaultAspirationSize,
  defaultGuideExtensionSize,
  defaultMicrocatheterSize,
  normalizeFrenchSize,
  sizesForAspiration,
  sizesForGuideExtension,
  sizesForMicrocatheter,
} from '@/lib/constants'

describe('named device sizes', () => {
  it('lists Finecross 1.8F and 2.6F from the published taper', () => {
    expect(sizesForMicrocatheter('Finecross')).toEqual(['1.8F', '2.6F'])
    expect(defaultMicrocatheterSize('Finecross')).toBe('1.8F')
  })

  it('lists Corsair, Caravel, Turnpike and Mamba family French sizes', () => {
    expect(sizesForMicrocatheter('Corsair')).toEqual(['1.3F', '2.1F', '2.6F', '2.8F', '2.9F'])
    expect(sizesForMicrocatheter('Caravel')).toEqual(['1.4F', '1.9F', '2.6F'])
    expect(sizesForMicrocatheter('Turnpike')).toEqual(['1.6F', '2.1F', '2.2F', '2.6F', '2.9F'])
    expect(sizesForMicrocatheter('Mamba')).toEqual(['1.4F', '2.1F', '2.4F', '2.9F'])
  })

  it('lists published aspiration and guide-extension sizes', () => {
    expect(sizesForAspiration('Export')).toEqual(['6F', '7F'])
    expect(sizesForAspiration('Eliminate')).toEqual(['6F', '7F', '8F'])
    expect(sizesForAspiration('Pronto')).toEqual(['6F', '5.5F', '7F', '8F'])
    expect(defaultAspirationSize('Export')).toBe('6F')
    expect(sizesForGuideExtension('GuideLiner')).toEqual(['6F', '5F', '5.5F', '7F', '8F'])
    expect(sizesForGuideExtension('Guidezilla')).toEqual(['6F', '6F Long', '7F', '8F'])
    expect(sizesForGuideExtension('Telescope')).toEqual(['6F', '7F'])
    expect(defaultGuideExtensionSize('GuideLiner')).toBe('6F')
  })

  it('normalizes typed French sizes', () => {
    expect(normalizeFrenchSize('1.8')).toBe('1.8F')
    expect(normalizeFrenchSize('6f')).toBe('6F')
    expect(normalizeFrenchSize('6F Long')).toBe('6F Long')
  })
})
