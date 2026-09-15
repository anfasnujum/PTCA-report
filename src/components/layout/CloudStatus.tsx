import { Cloud, CloudOff, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSyncStore, type CloudStatus } from '@/store/useSyncStore'

const labels: Record<CloudStatus, string> = {
  disabled: 'Local only',
  idle: 'S3 ready',
  syncing: 'Syncing',
  ok: 'Synced',
  error: 'Sync error',
}

export function CloudStatus({ compact = false }: { compact?: boolean }) {
  const status = useSyncStore((s) => s.status)
  const error = useSyncStore((s) => s.error)
  const lastPullAt = useSyncStore((s) => s.lastPullAt)
  const sync = useSyncStore((s) => s.sync)

  const title = error ?? (lastPullAt ? `Last sync ${new Date(lastPullAt).toLocaleTimeString()}` : labels[status])

  return (
    <div className="flex items-center gap-1">
      <Link
        to="/settings"
        title={title}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
          status === 'error' ? 'bg-danger/10 text-danger' : 'bg-background text-muted',
        )}
      >
        {status === 'syncing' ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : status === 'disabled' ? (
          <CloudOff className="size-3.5" />
        ) : (
          <Cloud className="size-3.5" />
        )}
        {compact ? null : <span className="hidden sm:inline">{labels[status]}</span>}
      </Link>
      {status !== 'disabled' && status !== 'syncing' ? (
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-background"
          onClick={() => void sync()}
          title="Sync now"
        >
          <RefreshCw className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}
