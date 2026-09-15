import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { BrandMark } from '@/components/layout/BrandMark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { isS3Ready } from '@/lib/s3Settings'
import { loadStaffSettings, saveStaffSettings, type StaffSettings } from '@/lib/staffSettings'
import { useSyncStore } from '@/store/useSyncStore'

export function ConfigPage() {
  const navigate = useNavigate()
  const lastPullAt = useSyncStore((s) => s.lastPullAt)
  const pushStaff = useSyncStore((s) => s.pushStaff)
  const [form, setForm] = useState<StaffSettings>(() => loadStaffSettings())
  const [saved, setSaved] = useState(false)
  const cloud = isS3Ready()

  useEffect(() => {
    setForm(loadStaffSettings())
  }, [lastPullAt])

  const persist = (next: StaffSettings) => {
    const stored = saveStaffSettings(next)
    setForm(stored)
    setSaved(true)
    pushStaff()
  }

  const patchList = (key: keyof StaffSettings, names: string[]) => {
    setSaved(false)
    persist({ ...form, [key]: names })
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface pt-safe">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3.5">
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-2xl hover:bg-background"
            onClick={() => navigate('/')}
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <BrandMark subtitle="Staff lists" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <p className="text-sm leading-relaxed text-muted">
          Names added here appear in the Consultant, Technologist, and Scrub nurse dropdowns on the
          patient page. Use Other on a case for a one-off name that should not join these lists.
          {cloud
            ? ' Lists are stored on this device and copied to S3 with the rest of CathNote, so other browsers with the same keys get the same names.'
            : ' Turn on S3 in Settings to copy these lists to other devices.'}
        </p>

        <NameList
          title="Consultant"
          names={form.consultants}
          placeholder="Consultant name"
          onChange={(consultants) => patchList('consultants', consultants)}
        />
        <NameList
          title="Technologist"
          names={form.technologists}
          placeholder="Technologist name"
          onChange={(technologists) => patchList('technologists', technologists)}
        />
        <NameList
          title="Scrub nurse"
          names={form.scrubNurses}
          placeholder="Scrub nurse name"
          onChange={(scrubNurses) => patchList('scrubNurses', scrubNurses)}
        />

        {saved ? (
          <p className="text-sm font-medium text-ok">
            {cloud ? 'Saved on this device and queued for S3.' : 'Saved on this device.'}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function NameList({
  title,
  names,
  placeholder,
  onChange,
}: {
  title: string
  names: string[]
  placeholder: string
  onChange: (names: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const name = draft.trim()
    if (!name) return
    onChange([...names, name])
    setDraft('')
  }

  return (
    <Section title={title}>
      {names.length === 0 ? (
        <p className="text-sm text-muted">No names yet. Add one to show it in the dropdown.</p>
      ) : (
        <ul className="space-y-2">
          {names.map((name) => (
            <li
              key={name}
              className="flex items-center gap-2 rounded-2xl bg-card px-3 py-2 shadow-card"
            >
              <p className="min-w-0 flex-1 text-sm font-medium">{name}</p>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-background hover:text-danger"
                aria-label={`Remove ${name}`}
                onClick={() => onChange(names.filter((item) => item !== name))}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add} disabled={!draft.trim()}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>
    </Section>
  )
}
