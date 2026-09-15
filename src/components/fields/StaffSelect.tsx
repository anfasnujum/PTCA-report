import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Section } from '@/components/ui/section'
import { Select } from '@/components/ui/select'
import { matchStaffName } from '@/lib/staffSettings'

export function StaffSelect({
  title,
  names,
  value,
  placeholder,
  onChange,
}: {
  title: string
  names: readonly string[]
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
  const listed = matchStaffName(value, names)
  const [pickedOther, setPickedOther] = useState(
    () => Boolean(value.trim()) && !matchStaffName(value, names),
  )
  const isOther = pickedOther || (Boolean(value.trim()) && !listed)
  const selectValue = isOther ? 'Other' : listed

  return (
    <Section title={title}>
      <Select
        value={selectValue}
        onChange={(e) => {
          const next = e.target.value
          if (next === 'Other') {
            setPickedOther(true)
            onChange(listed ? '' : value)
            return
          }
          setPickedOther(false)
          onChange(next)
        }}
      >
        <option value="">Select</option>
        {names.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        <option value="Other">Other</option>
      </Select>
      {isOther ? (
        <Input
          className="mt-2"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </Section>
  )
}
