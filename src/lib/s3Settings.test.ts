import { describe, expect, it } from 'vitest'
import {
  DEFAULT_S3_BUCKET,
  DEFAULT_S3_REGION,
  defaultS3Settings,
  isS3Ready,
  normalizePrefix,
  settingsMissing,
  type S3Settings,
} from '@/lib/s3Settings'

const ready: S3Settings = {
  enabled: true,
  bucket: 'cathnote',
  region: 'ap-south-1',
  accessKeyId: 'AKIATEST',
  secretAccessKey: 'secret',
  prefix: 'cathnote/',
}

describe('s3Settings', () => {
  it('defaults to the Mumbai access point alias', () => {
    const defaults = defaultS3Settings()
    expect(defaults.bucket).toBe(DEFAULT_S3_BUCKET)
    expect(defaults.bucket.endsWith('-s3alias')).toBe(true)
    expect(defaults.region).toBe(DEFAULT_S3_REGION)
    expect(defaults.enabled).toBe(false)
  })

  it('normalizes prefixes', () => {
    expect(normalizePrefix('cathnote')).toBe('cathnote/')
    expect(normalizePrefix('/cathnote/')).toBe('cathnote/')
    expect(normalizePrefix('  ')).toBe('cathnote/')
  })

  it('requires every field before sync is ready', () => {
    expect(isS3Ready({ ...ready, enabled: false })).toBe(false)
    expect(isS3Ready({ ...ready, bucket: '' })).toBe(false)
    expect(isS3Ready(ready)).toBe(true)
    expect(settingsMissing({ ...ready, accessKeyId: '' })).toBe('Access key is required.')
  })
})
