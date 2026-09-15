const STORAGE_KEY = 'cathnote.s3'

export const DEFAULT_S3_BUCKET =
  'cathnote-bucket-verc-8ju83tr675qbbkrch3ppbq7xz19araps3b-s3alias'
export const DEFAULT_S3_REGION = 'ap-south-1'
export const DEFAULT_S3_PREFIX = 'cathnote/'

const LEGACY_BUCKETS = new Set(['cathnote-bucket'])

export type S3Settings = {
  enabled: boolean
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  prefix: string
}

export const defaultS3Settings = (): S3Settings => ({
  enabled: false,
  bucket: import.meta.env.VITE_S3_BUCKET || DEFAULT_S3_BUCKET,
  region: import.meta.env.VITE_S3_REGION || DEFAULT_S3_REGION,
  accessKeyId: '',
  secretAccessKey: '',
  prefix: import.meta.env.VITE_S3_PREFIX || DEFAULT_S3_PREFIX,
})

export function normalizePrefix(prefix: string): string {
  const trimmed = prefix.trim().replace(/^\/+/, '').replace(/\/+$/, '')
  return trimmed ? `${trimmed}/` : 'cathnote/'
}

function resolveBucket(bucket: string, fallback: string): string {
  const value = bucket.trim()
  if (!value || LEGACY_BUCKETS.has(value)) return fallback
  return value
}

export function loadS3Settings(): S3Settings {
  const base = defaultS3Settings()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return base
    const parsed = JSON.parse(raw) as Partial<S3Settings>
    return {
      enabled: Boolean(parsed.enabled),
      bucket: resolveBucket(String(parsed.bucket ?? ''), base.bucket),
      region: String(parsed.region || base.region).trim() || DEFAULT_S3_REGION,
      accessKeyId: String(parsed.accessKeyId ?? '').trim(),
      secretAccessKey: String(parsed.secretAccessKey ?? ''),
      prefix: normalizePrefix(String(parsed.prefix || base.prefix)),
    }
  } catch {
    return base
  }
}

export function saveS3Settings(settings: S3Settings): S3Settings {
  const next: S3Settings = {
    enabled: settings.enabled,
    bucket: resolveBucket(settings.bucket, DEFAULT_S3_BUCKET),
    region: settings.region.trim() || DEFAULT_S3_REGION,
    accessKeyId: settings.accessKeyId.trim(),
    secretAccessKey: settings.secretAccessKey,
    prefix: normalizePrefix(settings.prefix),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function isS3Ready(settings: S3Settings = loadS3Settings()): boolean {
  return Boolean(
    settings.enabled &&
      settings.bucket &&
      settings.region &&
      settings.accessKeyId &&
      settings.secretAccessKey,
  )
}

export function settingsMissing(settings: S3Settings): string | null {
  if (!settings.bucket) return 'Access point alias is required.'
  if (!settings.region) return 'Region is required.'
  if (!settings.accessKeyId) return 'Access key is required.'
  if (!settings.secretAccessKey) return 'Secret key is required.'
  return null
}
