import { AwsClient } from 'aws4fetch'
import { loadS3Settings, type S3Settings } from '@/lib/s3Settings'

function endpoint(settings: S3Settings, extraPath = '', query = ''): string {
  const { bucket, region } = settings
  const path = extraPath ? `/${extraPath}` : ''
  const qs = query ? `?${query}` : ''
  if (bucket.includes('.')) {
    return `https://s3.${region}.amazonaws.com/${bucket}${path}${qs}`
  }
  return `https://${bucket}.s3.${region}.amazonaws.com${path}${qs}`
}

function encodeKey(key: string): string {
  return key
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
}

function clientFor(settings: S3Settings): AwsClient {
  return new AwsClient({
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    region: settings.region,
    service: 's3',
  })
}

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  const code = text.match(/<Code>([^<]+)<\/Code>/)?.[1]
  const message = text.match(/<Message>([^<]+)<\/Message>/)?.[1]
  if (code && message) return `${code}: ${message}`
  if (res.status === 0 || res.status === 403) {
    return 'S3 refused the request. Check CORS, IAM permissions, bucket name, and region.'
  }
  return text.trim() || `S3 request failed (${res.status})`
}

export async function s3PutJson(key: string, body: unknown, settings: S3Settings = loadS3Settings()): Promise<void> {
  const aws = clientFor(settings)
  const res = await aws.fetch(endpoint(settings, encodeKey(key)), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-amz-server-side-encryption': 'AES256',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readError(res))
}

export async function s3Delete(key: string, settings: S3Settings = loadS3Settings()): Promise<void> {
  const aws = clientFor(settings)
  const res = await aws.fetch(endpoint(settings, encodeKey(key)), { method: 'DELETE' })
  if (res.status === 404) return
  if (!res.ok) throw new Error(await readError(res))
}

export async function s3GetJson<T>(key: string, settings: S3Settings = loadS3Settings()): Promise<T | undefined> {
  const aws = clientFor(settings)
  const res = await aws.fetch(endpoint(settings, encodeKey(key)), { method: 'GET' })
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(await readError(res))
  return (await res.json()) as T
}

export async function s3ListKeys(prefix: string, settings: S3Settings = loadS3Settings()): Promise<string[]> {
  const aws = clientFor(settings)
  const query = new URLSearchParams({
    'list-type': '2',
    prefix,
    'max-keys': '1000',
  }).toString()
  const res = await aws.fetch(endpoint(settings, '', query), { method: 'GET' })
  if (!res.ok) throw new Error(await readError(res))
  const xml = await res.text()
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => decodeXml(m[1] ?? ''))
}

function decodeXml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
}

export function procedureObjectKey(prefix: string, id: string): string {
  return `${prefix}procedures/${id}.json`
}

export function catalogueObjectKey(prefix: string): string {
  return `${prefix}catalogue.json`
}
