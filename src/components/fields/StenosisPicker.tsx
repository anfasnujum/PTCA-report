import type { AngioFinding } from '@/types/procedure'
import { Chip, ChipScroller, NumberChips } from '@/components/ui/chip'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import {
  DEFAULT_STENOSIS_RANGE,
  formatStenosis,
  stenosisModeOf,
  stenosisRangeOf,
  STENOSIS_PRESETS,
} from '@/lib/format'

const MODE_CHIP = 'min-h-7 px-2.5 text-xs'

function StenosisValuePicker({
  label,
  value,
  onChange,
}: {
  label?: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="space-y-2">
      {label ? <p className="text-sm font-medium text-foreground">{label}</p> : null}
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <NumberChips
        values={STENOSIS_PRESETS}
        value={value}
        onChange={onChange}
        suffix="%"
        chipClassName={MODE_CHIP}
      />
    </div>
  )
}

export function StenosisPicker({
  title,
  f,
  setF,
  unset = false,
}: {
  title: string
  f: AngioFinding
  setF: (next: AngioFinding) => void
  unset?: boolean
}) {
  return (
    <Section
      title={unset ? title : `${title}  ${formatStenosis(f)}`}
      action={
        <ChipScroller>
          <Chip
            className={MODE_CHIP}
            selected={!unset && stenosisModeOf(f) === 'single'}
            onClick={() => setF({ ...f, stenosisMode: 'single' })}
          >
            Single
          </Chip>
          <Chip
            className={MODE_CHIP}
            selected={!unset && stenosisModeOf(f) === 'range'}
            onClick={() =>
              setF({
                ...f,
                stenosisMode: 'range',
                stenosisRange: f.stenosisRange ?? DEFAULT_STENOSIS_RANGE,
              })
            }
          >
            Range
          </Chip>
        </ChipScroller>
      }
    >
      {stenosisModeOf(f) === 'range' && !unset ? (
        <>
          <StenosisValuePicker
            label="From"
            value={f.stenosis}
            onChange={(stenosis) =>
              setF({
                ...f,
                stenosis,
                stenosisMode: 'range',
                stenosisRange: f.stenosisRange ?? DEFAULT_STENOSIS_RANGE,
              })
            }
          />
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Range</p>
            <div className="relative">
              <Input
                inputMode="numeric"
                placeholder="10"
                value={stenosisRangeOf(f)}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '' || /^\d+$/.test(v)) {
                    setF({
                      ...f,
                      stenosisMode: 'range',
                      stenosisRange: v === '' ? DEFAULT_STENOSIS_RANGE : Number(v),
                    })
                  }
                }}
                className="pr-10"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">
                %
              </span>
            </div>
          </div>
        </>
      ) : (
        <StenosisValuePicker
          value={unset ? Number.NaN : f.stenosis}
          onChange={(stenosis) => setF({ ...f, stenosis, stenosisMode: 'single' })}
        />
      )}
    </Section>
  )
}
