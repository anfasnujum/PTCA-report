import { db } from '@/db'
import {
  catalogueObjectKey,
  procedureObjectKey,
  s3Delete,
  s3GetJson,
  s3ListKeys,
  s3PutJson,
  staffObjectKey,
} from '@/lib/s3Client'
import { isDeletedProcedureId, rememberDeletedProcedure } from '@/lib/deletedProcedures'
import { isS3Ready, loadS3Settings, type S3Settings } from '@/lib/s3Settings'
import { loadStaffSettings, parseStaffSettings, writeStaffSettings } from '@/lib/staffSettings'
import { isSeedProcedureId, mergeCatalogues, pickNewerProcedure, pickNewerStaff } from '@/lib/syncMerge'
import type { CatalogueItem, Procedure } from '@/types/procedure'

const dirtyProcedureIds = new Set<string>()
const pendingProcedures = new Map<string, Procedure>()
let procedureFlushTimer: ReturnType<typeof setTimeout> | undefined
let catalogueFlushTimer: ReturnType<typeof setTimeout> | undefined
let staffFlushTimer: ReturnType<typeof setTimeout> | undefined
let procedureFlush: Promise<void> = Promise.resolve()
let catalogueFlush: Promise<void> = Promise.resolve()
let staffFlush: Promise<void> = Promise.resolve()
let onCloudError: ((message: string) => void) | undefined
let onCatalogueMerged: (() => void) | undefined
let onStaffMerged: (() => void) | undefined

export function setCloudSyncErrorHandler(handler: ((message: string) => void) | undefined): void {
  onCloudError = handler
}

export function setCloudCatalogueHandler(handler: (() => void) | undefined): void {
  onCatalogueMerged = handler
}

export function setCloudStaffHandler(handler: (() => void) | undefined): void {
  onStaffMerged = handler
}

function reportError(error: unknown): void {
  const message = error instanceof Error && error.message ? error.message : 'S3 sync failed.'
  onCloudError?.(message)
}

export function beginProcedureEdit(id: string): void {
  dirtyProcedureIds.add(id)
}

export function endProcedureEdit(id: string): void {
  dirtyProcedureIds.delete(id)
}

function settingsOrThrow(): S3Settings {
  const settings = loadS3Settings()
  if (!isS3Ready(settings)) {
    throw new Error('S3 sync is not configured.')
  }
  return settings
}

export async function testS3Connection(): Promise<void> {
  const settings = settingsOrThrow()
  await s3PutJson(
    `${settings.prefix}heartbeat.json`,
    { ok: true, at: Date.now() },
    settings,
  )
  await s3ListKeys(settings.prefix, settings)
}

export async function runFullSync(): Promise<{ pulled: number; pushed: number }> {
  const settings = settingsOrThrow()
  const prefix = settings.prefix
  const remoteKeys = (await s3ListKeys(`${prefix}procedures/`, settings)).filter((key) =>
    key.endsWith('.json'),
  )

  const remoteById = new Map<string, Procedure>()
  for (const key of remoteKeys) {
    const remote = await s3GetJson<Procedure>(key, settings)
    if (remote?.id && !isSeedProcedureId(remote.id)) {
      remoteById.set(remote.id, remote)
    }
  }

  const localRows = (await db.procedures.toArray()).filter((p) => !isSeedProcedureId(p.id))
  const localById = new Map(localRows.map((p) => [p.id, p]))
  const ids = new Set([...localById.keys(), ...remoteById.keys()])

  let pulled = 0
  let pushed = 0

  for (const id of ids) {
    if (isDeletedProcedureId(id)) {
      pendingProcedures.delete(id)
      if (localById.has(id)) await db.procedures.delete(id)
      if (remoteById.has(id)) {
        try {
          await s3Delete(procedureObjectKey(prefix, id), settings)
        } catch (error) {
          reportError(error)
        }
      }
      continue
    }
    if (dirtyProcedureIds.has(id)) continue
    const chosen = pickNewerProcedure(localById.get(id), remoteById.get(id))
    if (!chosen) continue
    const local = localById.get(id)
    const remote = remoteById.get(id)
    if (!local || chosen.updatedAt > local.updatedAt) {
      await db.procedures.put(chosen)
      pulled += 1
    }
    if (!remote || chosen.updatedAt > remote.updatedAt) {
      await s3PutJson(procedureObjectKey(prefix, chosen.id), chosen, settings)
      pushed += 1
    }
  }

  const localCatalogue = await db.catalogue.toArray()
  const remoteCatalogue = (await s3GetJson<CatalogueItem[]>(catalogueObjectKey(prefix), settings)) ?? []
  const merged = mergeCatalogues(localCatalogue, remoteCatalogue)
  await replaceCatalogue(merged)
  onCatalogueMerged?.()
  await s3PutJson(catalogueObjectKey(prefix), merged, settings)

  await syncStaff(settings)

  return { pulled, pushed }
}

async function replaceCatalogue(items: CatalogueItem[]): Promise<void> {
  const keep = new Set(items.map((i) => i.id))
  const existing = await db.catalogue.toArray()
  const extras = existing.filter((i) => !keep.has(i.id)).map((i) => i.id)
  await db.transaction('rw', db.catalogue, async () => {
    if (extras.length) await db.catalogue.bulkDelete(extras)
    if (items.length) await db.catalogue.bulkPut(items)
  })
}

async function flushProcedures(): Promise<void> {
  if (!isS3Ready() || pendingProcedures.size === 0) {
    pendingProcedures.clear()
    return
  }
  const settings = loadS3Settings()
  const batch = [...pendingProcedures.values()]
  pendingProcedures.clear()
  try {
    for (const procedure of batch) {
      if (isSeedProcedureId(procedure.id) || isDeletedProcedureId(procedure.id)) continue
      await s3PutJson(procedureObjectKey(settings.prefix, procedure.id), procedure, settings)
    }
  } catch (error) {
    reportError(error)
  }
}

async function syncStaff(settings: S3Settings): Promise<void> {
  const local = loadStaffSettings()
  const remoteRaw = await s3GetJson<unknown>(staffObjectKey(settings.prefix), settings)
  const remote = remoteRaw === undefined ? undefined : parseStaffSettings(remoteRaw)
  const chosen = pickNewerStaff(local, remote)
  if (!chosen) return
  writeStaffSettings(chosen)
  onStaffMerged?.()
  if (!remote || chosen.updatedAt >= remote.updatedAt) {
    await s3PutJson(staffObjectKey(settings.prefix), chosen, settings)
  }
}

async function flushStaff(): Promise<void> {
  if (!isS3Ready()) return
  const settings = loadS3Settings()
  try {
    await syncStaff(settings)
  } catch (error) {
    reportError(error)
  }
}

async function flushCatalogue(): Promise<void> {
  if (!isS3Ready()) return
  const settings = loadS3Settings()
  try {
    const localCatalogue = await db.catalogue.toArray()
    const remoteCatalogue =
      (await s3GetJson<CatalogueItem[]>(catalogueObjectKey(settings.prefix), settings)) ?? []
    const merged = mergeCatalogues(localCatalogue, remoteCatalogue)
    await replaceCatalogue(merged)
    onCatalogueMerged?.()
    await s3PutJson(catalogueObjectKey(settings.prefix), merged, settings)
  } catch (error) {
    reportError(error)
  }
}

export function queueProcedureCloudPush(procedure: Procedure): void {
  if (!isS3Ready() || isSeedProcedureId(procedure.id) || isDeletedProcedureId(procedure.id)) return
  pendingProcedures.set(procedure.id, procedure)
  if (procedureFlushTimer) clearTimeout(procedureFlushTimer)
  procedureFlushTimer = setTimeout(() => {
    procedureFlush = procedureFlush.then(flushProcedures, flushProcedures)
  }, 500)
}

export async function queueProcedureCloudDelete(id: string): Promise<void> {
  rememberDeletedProcedure(id)
  pendingProcedures.delete(id)
  if (!isS3Ready() || isSeedProcedureId(id)) return
  await procedureFlush.catch(() => undefined)
  const settings = loadS3Settings()
  try {
    await s3Delete(procedureObjectKey(settings.prefix, id), settings)
  } catch (error) {
    reportError(error)
    throw error
  }
}

export function queueCatalogueCloudPush(): void {
  if (!isS3Ready()) return
  if (catalogueFlushTimer) clearTimeout(catalogueFlushTimer)
  catalogueFlushTimer = setTimeout(() => {
    catalogueFlush = catalogueFlush.then(flushCatalogue, flushCatalogue)
  }, 800)
}

export function queueStaffCloudPush(): void {
  if (!isS3Ready()) return
  if (staffFlushTimer) clearTimeout(staffFlushTimer)
  staffFlushTimer = setTimeout(() => {
    staffFlush = staffFlush.then(flushStaff, flushStaff)
  }, 500)
}
