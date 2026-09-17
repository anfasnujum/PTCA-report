import type { CSSProperties } from 'react'
import { fmtDisplayDate } from '@/lib/format'
import { accessSpecialNote, formatAorticPressureDisplay } from '@/lib/access'
import {
  accessShortCode,
  ptcaAdjuvantsText,
  ptcaCommentSentence,
  ptcaComplicationsText,
  ptcaContrastText,
  LONGEST_INVENTORY_LABEL,
  ptcaInventoryBlocks,
  ptcaProcedureParagraphs,
  ptcaResultLabel,
  ptcaTitle,
  targetVesselsLesions,
} from '@/lib/ptcaReport'
import { formatTechnologistNames, labTechnologistSlots } from '@/lib/staffSettings'
import type { Procedure } from '@/types/procedure'

// Marks the intended .docx point size for a section, independent of its on-screen
// pixel size (tuned separately for screen legibility). Read back by the doc-editor's
// style-baking step so exported formatting matches the non-edited .docx exactly.
function pt(n: number): CSSProperties {
  return { '--pt': n } as CSSProperties
}

function FieldCell({ label, value }: { label: string; value: string }) {
  return (
    <td className="p-1.5 align-top font-normal">
      {label} : {value || '____'}
    </td>
  )
}

function DetailLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <p>
      <span className={bold ? 'font-bold' : 'font-semibold'}>{label}</span> : {value}
    </p>
  )
}

function inventoryItems(value: string): string[] {
  return value ? value.split('\n') : ['']
}

function InventoryLines({ lines }: { lines: { label: string; value: string }[] }) {
  return (
    <table className="inventory-pair w-full border-collapse">
      <tbody>
        {lines.map((line) => (
          <tr key={line.label}>
            <td className="inventory-label align-top whitespace-nowrap font-semibold">
              <span className="inventory-label-sizer" aria-hidden>
                {LONGEST_INVENTORY_LABEL}
              </span>
              {line.label}
            </td>
            <td className="inventory-colon align-top whitespace-nowrap">:</td>
            <td className="align-top">
              {inventoryItems(line.value).map((item, i) => (
                <span key={`${line.label}-${i}`}>
                  {i > 0 ? <br /> : null}
                  {item}
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function PtcaReportLayout({ procedure }: { procedure: Procedure }) {
  const p = procedure
  const inventoryBlocks = ptcaInventoryBlocks(p)
  const specialNotes = accessSpecialNote(p.access)
  const aortic = formatAorticPressureDisplay(p.lab.aorticPressureMmHg)

  return (
    <div
      className="report-doc ptca-report space-y-3 rounded-2xl bg-card p-6 text-[18px] leading-[2] shadow-card"
      style={{ fontFamily: "'Times New Roman', Times, serif", ...pt(13.5) }}
    >
      <div className="text-center">
        <h2 className="text-[24px] uppercase tracking-wide underline" style={pt(18)}>
          {ptcaTitle(p)}
        </h2>
        <p className="mt-1 font-bold">Consultant: {p.lab.doctorName || '____'}</p>
      </div>
      <hr className="border-t border-border" />

      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <FieldCell label="Name" value={p.patient.name.toUpperCase()} />
            <FieldCell
              label="Age/Sex"
              value={
                p.patient.age === '' && !p.patient.sex
                  ? ''
                  : `${p.patient.age === '' ? '—' : p.patient.age}/${p.patient.sex || '—'}`
              }
            />
            <FieldCell label="Date" value={fmtDisplayDate(p.patient.date)} />
          </tr>
          <tr>
            <FieldCell label="CATH NO" value={p.patient.hospitalId} />
            <FieldCell label="IP No" value={p.patient.ipNo} />
            <td />
          </tr>
          <tr>
            <FieldCell label="CATH Tech" value={formatTechnologistNames(labTechnologistSlots(p.lab))} />
            <FieldCell label="Scrub nurse" value={p.lab.scrubNurse} />
            <td />
          </tr>
        </tbody>
      </table>

      <div className="space-y-1">
        <DetailLine label="Premedication" value="Nil" />
        <DetailLine label="Vascular Access" value={accessShortCode(p.access)} />
        {specialNotes ? <DetailLine label="Special Notes" value={specialNotes} /> : null}
        <DetailLine label="Target Vessel/lesions" value={targetVesselsLesions(p)} />
        {inventoryBlocks.map((block, i) => (
          <div key={`inv-${i}`}>
            <DetailLine label="Inventory" value={block.heading} bold />
            <div className="pl-6">
              <InventoryLines lines={block.lines} />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <DetailLine label="Result" value={ptcaResultLabel(p.outcome)} bold />
        <DetailLine label="Complications" value={ptcaComplicationsText(p.outcome)} bold />
        <DetailLine label="Adjuvants" value={ptcaAdjuvantsText(p.periprocedural)} bold />
        <DetailLine label="Contrast" value={ptcaContrastText(p)} bold />
        <p className="whitespace-pre">
          <span className="font-bold">Hemodynamic Data</span> :{'\t'}
          <span className="font-bold">Aortic</span>:{'\t'}
          <span className="font-bold">PrePTCA</span>: {aortic || '____'}
        </p>
      </div>

      <div className="report-page-break">
        <p className="font-bold">PROCEDURE:</p>
        {ptcaProcedureParagraphs(p).map((paragraph, i) => (
          <p key={`procedure-${i}`} className="text-justify">
            {paragraph}
          </p>
        ))}
      </div>

      <p className="font-bold">COMMENT: {p.notes.trim() || ptcaCommentSentence(p)}</p>

      <div className="text-right">
        <p className="font-bold">{p.lab.doctorName || '____'}</p>
        <p className="text-muted">Consultant Interventional Cardiologist &amp; Asst. Professor</p>
      </div>
    </div>
  )
}
