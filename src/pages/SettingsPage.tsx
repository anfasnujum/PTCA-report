import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { BrandMark } from '@/components/layout/BrandMark'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { Switch } from '@/components/ui/switch'
import { DEFAULT_S3_BUCKET, loadS3Settings, saveS3Settings, settingsMissing, type S3Settings } from '@/lib/s3Settings'
import { useSyncStore } from '@/store/useSyncStore'

export function SettingsPage() {
  const navigate = useNavigate()
  const sync = useSyncStore((s) => s.sync)
  const testConnection = useSyncStore((s) => s.testConnection)
  const status = useSyncStore((s) => s.status)
  const error = useSyncStore((s) => s.error)
  const [form, setForm] = useState<S3Settings>(() => loadS3Settings())
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)

  const patch = (over: Partial<S3Settings>) => {
    setSaved(false)
    setTestMessage(null)
    setForm((f) => ({ ...f, ...over }))
  }

  const persist = () => {
    const next = saveS3Settings(form)
    setForm(next)
    setSaved(true)
    void sync()
  }

  const onTest = async () => {
    const missing = settingsMissing(form)
    if (missing) {
      setTestMessage(missing)
      return
    }
    setTesting(true)
    setTestMessage(null)
    const previous = loadS3Settings()
    saveS3Settings({ ...form, enabled: true })
    try {
      await testConnection()
      setForm((f) => ({ ...f, enabled: true }))
      setTestMessage('Connected. This browser can read and write the bucket.')
      void sync()
    } catch (err) {
      saveS3Settings(previous)
      setTestMessage(err instanceof Error ? err.message : 'Connection failed.')
    } finally {
      setTesting(false)
    }
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
          <BrandMark subtitle="Cloud sync" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <p className="text-sm leading-relaxed text-muted">
          Keep using the app offline on this device. When S3 is enabled, procedures and the device
          catalogue are copied to your private bucket so other phones or laptops with the same keys
          see the same cases. Removing a case on Home also deletes its object from the bucket. The
          later save wins if the same case is edited in two places at once.
        </p>

        <Switch
          checked={form.enabled}
          onChange={(enabled) => patch({ enabled })}
          label="Sync with S3"
        />

        <Section title="Bucket">
          <Field
            label="Access point alias"
            value={form.bucket}
            onChange={(bucket) => patch({ bucket })}
            placeholder={DEFAULT_S3_BUCKET}
            autoComplete="off"
            className="text-[13px] tracking-tight"
          />
          <Field
            label="Region"
            value={form.region}
            onChange={(region) => patch({ region })}
            placeholder="ap-south-1"
            autoComplete="off"
          />
          <Field
            label="Prefix"
            value={form.prefix}
            onChange={(prefix) => patch({ prefix })}
            placeholder="cathnote/"
            autoComplete="off"
          />
        </Section>

        <Section title="IAM keys">
          <p className="text-sm text-muted">
            Stored only in this browser, never in the app bundle. Use an IAM user limited to this
            bucket. Patient names and hospital IDs will live in the objects you sync.
          </p>
          <Field
            label="Access key ID"
            value={form.accessKeyId}
            onChange={(accessKeyId) => patch({ accessKeyId })}
            autoComplete="off"
          />
          <Field
            label="Secret access key"
            value={form.secretAccessKey}
            onChange={(secretAccessKey) => patch({ secretAccessKey })}
            type="password"
            autoComplete="new-password"
          />
        </Section>

        <div className="flex flex-wrap gap-2">
          <Button onClick={persist}>Save</Button>
          <Button variant="secondary" onClick={() => void onTest()} disabled={testing}>
            {testing ? 'Testing…' : 'Test connection'}
          </Button>
        </div>

        {saved ? <p className="text-sm font-medium text-ok">Saved on this device.</p> : null}
        {testMessage ? (
          <p className={testMessage.startsWith('Connected') ? 'text-sm text-ok' : 'text-sm text-danger'}>
            {testMessage}
          </p>
        ) : error && status === 'error' ? (
          <p className="text-sm text-danger">{error}</p>
        ) : null}

        <Section title="AWS setup">
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-foreground">
            <li>
              Sync goes through access point{' '}
              <code className="rounded bg-background px-1.5 py-0.5 text-[12px]">cathnote-bucket-vercel</code> on
              private bucket <code className="rounded bg-background px-1.5 py-0.5 text-[12px]">cathnote-bucket</code>{' '}
              in Mumbai (<code className="rounded bg-background px-1.5 py-0.5 text-[12px]">ap-south-1</code>).
            </li>
            <li>
              In the bucket → Permissions → CORS, paste:
              <pre className="mt-2 overflow-x-auto rounded-2xl bg-background p-4 text-[12px]">{corsExample}</pre>
            </li>
            <li>
              Create an IAM user with this policy, allow that user on the access point policy too, then paste its
              access key above:
              <pre className="mt-2 overflow-x-auto rounded-2xl bg-background p-4 text-[12px]">{iamExample}</pre>
            </li>
          </ol>
        </Section>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  autoComplete,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  autoComplete?: string
  className?: string
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-widest text-foreground">{label}</span>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={className}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

const corsExample = `[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD", "DELETE"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "https://ptca-report-rhwa.vercel.app"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]`

const iamExample = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::cathnote-bucket",
        "arn:aws:s3:ap-south-1:975050082798:accesspoint/cathnote-bucket-vercel"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::cathnote-bucket/cathnote/*",
        "arn:aws:s3:ap-south-1:975050082798:accesspoint/cathnote-bucket-vercel/object/cathnote/*"
      ]
    }
  ]
}`
