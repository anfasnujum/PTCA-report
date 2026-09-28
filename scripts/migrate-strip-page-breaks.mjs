#!/usr/bin/env node
// One-time migration: strip the hardcoded `<div class="report-page-break">`
// wrapper (previously baked into PTCA reports' `docOverride` HTML whenever a
// report was hand-edited) out of every affected procedure stored in S3.
//
// Deliberately leaves `<hr class="report-page-break">` alone - that's the
// user-inserted manual page break, a kept feature, distinguished from the
// hardcoded one purely by tag (div vs hr).
//
// Uses the AWS CLI (`aws s3api ...`) under an existing local profile, rather
// than embedding a raw access key/secret anywhere - `aws sts get-caller-identity
// --profile <profile>` and a read-only ListObjectsV2/GetObject probe already
// confirmed the "default" profile has access to this bucket.
//
// Usage:
//   node scripts/migrate-strip-page-breaks.mjs            # dry run, no writes
//   node scripts/migrate-strip-page-breaks.mjs --write     # apply for real
//
// Config (env var overrides, all optional - defaults match .env.example):
//   S3_BUCKET, S3_REGION, S3_PREFIX, AWS_PROFILE

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const WRITE = process.argv.includes('--write')

const BUCKET = process.env.S3_BUCKET || 'cathnote-bucket-verc-8ju83tr675qbbkrch3ppbq7xz19araps3b-s3alias'
const REGION = process.env.S3_REGION || 'ap-south-1'
const PREFIX = normalizePrefix(process.env.S3_PREFIX || 'cathnote/')
const PROFILE = process.env.AWS_PROFILE || 'default'

function normalizePrefix(p) {
  return p ? (p.endsWith('/') ? p : `${p}/`) : ''
}

const REPORT_PAGE_BREAK_CLASS = 'report-page-break'
const SEED_IDS = new Set(['seed-demo', 'seed-demo-cag'])

function aws(args) {
  return execFileSync('aws', [...args, '--profile', PROFILE, '--region', REGION], {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  })
}

function listAllKeys(listPrefix) {
  const keys = []
  let token
  do {
    const args = ['s3api', 'list-objects-v2', '--bucket', BUCKET, '--prefix', listPrefix, '--output', 'json']
    if (token) args.push('--starting-token', token)
    const out = JSON.parse(aws(args) || '{}')
    for (const item of out.Contents ?? []) {
      if (item.Size > 0) keys.push(item.Key)
    }
    token = out.NextContinuationToken
  } while (token)
  return keys
}

function getJson(key) {
  const tmp = path.join(tmpDir, `get-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
  aws(['s3api', 'get-object', '--bucket', BUCKET, '--key', key, tmp])
  const text = readFileSync(tmp, 'utf8')
  rmSync(tmp, { force: true })
  return JSON.parse(text)
}

function putJson(key, body) {
  const tmp = path.join(tmpDir, `put-${Date.now()}-${Math.random().toString(36).slice(2)}.json`)
  writeFileSync(tmp, JSON.stringify(body))
  aws([
    's3api', 'put-object',
    '--bucket', BUCKET,
    '--key', key,
    '--body', tmp,
    '--content-type', 'application/json',
    '--server-side-encryption', 'AES256',
  ])
  rmSync(tmp, { force: true })
}

// Only matches <div class="report-page-break">...</div> - the hardcoded wrapper's
// content is known to be flat <p> tags with no nested <div>, so a non-greedy match
// to the first </div> is safe. Never matches the <hr class="report-page-break">
// variant (user-inserted manual breaks), since that's a different tag entirely.
function stripHardcodedPageBreaks(html) {
  const re = /<div([^>]*)\bclass="report-page-break"([^>]*)>([\s\S]*?)<\/div>/g
  let changed = false
  const result = html.replace(re, (_m, _pre, _post, inner) => {
    changed = true
    return inner
  })
  return { result, changed }
}

function snippet(html, contextChars = 60) {
  const idx = html.indexOf(REPORT_PAGE_BREAK_CLASS)
  if (idx === -1) return ''
  const start = Math.max(0, idx - contextChars)
  const end = Math.min(html.length, idx + REPORT_PAGE_BREAK_CLASS.length + contextChars)
  return `…${html.slice(start, end)}…`
}

let tmpDir

async function main() {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'cathnote-migrate-'))
  try {
    console.log(`Mode: ${WRITE ? 'WRITE (live)' : 'DRY RUN (no writes)'}`)
    console.log(`Bucket: ${BUCKET}  Region: ${REGION}  Prefix: "${PREFIX}"  Profile: ${PROFILE}`)

    const keys = listAllKeys(`${PREFIX}procedures/`).filter((k) => k.endsWith('.json'))
    console.log(`Found ${keys.length} procedure object(s).`)

    const backupDir = path.join(projectRoot, 'scripts', 'migration-backups')
    if (WRITE) mkdirSync(backupDir, { recursive: true })

    let withOverride = 0
    let matched = 0
    let written = 0

    for (const key of keys) {
      const id = key.slice(key.lastIndexOf('/') + 1).replace(/\.json$/, '')
      if (SEED_IDS.has(id)) continue

      const proc = getJson(key)
      if (!proc || typeof proc !== 'object') continue
      if (typeof proc.docOverride !== 'string' || !proc.docOverride) continue
      withOverride += 1

      const { result, changed } = stripHardcodedPageBreaks(proc.docOverride)
      if (!changed) continue
      matched += 1

      console.log(`\n[${id}] hardcoded page break found`)
      console.log(`  before: ${snippet(proc.docOverride)}`)

      if (WRITE) {
        writeFileSync(path.join(backupDir, `${id}.json`), JSON.stringify(proc, null, 2))
        const updated = { ...proc, docOverride: result, updatedAt: Date.now() }
        putJson(key, updated)
        written += 1
        console.log(`  written (backup saved to scripts/migration-backups/${id}.json)`)
      }
    }

    console.log(`\n${keys.length} procedure(s) scanned, ${withOverride} had a docOverride, ${matched} matched.`)
    if (!WRITE) {
      console.log(`Dry run only - no changes written. Re-run with --write to apply.`)
    } else {
      console.log(`${written} object(s) updated in S3.`)
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
