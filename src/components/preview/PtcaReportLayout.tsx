import { fmtDisplayDate } from '@/lib/format'
import { procedureSection } from '@/lib/noteTemplate'
import {
  accessShortCode,
  ptcaAdjuvantsText,
  ptcaCommentSentence,
  ptcaComplicationsText,
  ptcaContrastText,
  ptcaHemodynamicText,
  ptcaInventoryLines,
  ptcaInventorySummary,
  ptcaResultLabel,
  ptcaTitle,
  targetVesselsShort,
} from '@/lib/ptcaReport'
import type { Procedure } from '@/types/procedure'

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

export function PtcaReportLayout({ procedure }: { procedure: Procedure }) {
  const p = procedure
  const inventoryLines = ptcaInventoryLines(p)

  return (
    <div
      className="report-doc ptca-report space-y-3 rounded-2xl bg-card p-6 text-[13px] leading-snug shadow-card"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      <div className="text-center">
        <h2 className="text-lg uppercase tracking-wide underline">{ptcaTitle(p)}</h2>
        <p className="mt-1 font-bold">Consultant: {p.lab.doctorName || '____'}</p>
      </div>
      <hr className="border-t border-border" />

      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <FieldCell label="Name" value={p.patient.name.toUpperCase()} />
            <FieldCell label="Age" value={p.patient.age === '' ? '' : `${p.patient.age}/${p.patient.sex || '—'}`} />
            <FieldCell label="IP No" value={p.patient.ipNo} />
          </tr>
          <tr>
            <FieldCell label="Cath No" value={p.patient.hospitalId} />
            <FieldCell label="Date" value={fmtDisplayDate(p.patient.date)} />
            <td />
          </tr>
          <tr>
            <FieldCell label="Cath Tech" value={p.lab.technologist} />
            <FieldCell label="Scrub nurse" value={p.lab.scrubNurse} />
            <td />
          </tr>
        </tbody>
      </table>

      <div className="space-y-1">
        <DetailLine label="Premedication" value="Nil" />
        <DetailLine label="Vascular Access" value={accessShortCode(p.access)} />
        <DetailLine label="Target Vessel/lesions" value={targetVesselsShort(p)} />
        <DetailLine label="Inventory" value={ptcaInventorySummary(p)} bold />
        <div className="space-y-0.5 pl-6">
          {inventoryLines.map((line, i) => (
            <DetailLine key={`${line.label}-${i}`} label={line.label} value={line.value} />
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <DetailLine label="Result" value={ptcaResultLabel(p.outcome)} bold />
        <DetailLine label="Complications" value={ptcaComplicationsText(p.outcome)} bold />
        <DetailLine label="Adjuvants" value={ptcaAdjuvantsText(p.periprocedural)} bold />
        <DetailLine label="Contrast" value={ptcaContrastText(p.periprocedural)} bold />
        <DetailLine label="Hemodynamic Data" value={ptcaHemodynamicText(p.lab)} bold />
      </div>

      <div>
        <p className="font-bold">PROCEDURE:</p>
        <p className="text-justify">{procedureSection(p.events)}</p>
      </div>

      <p className="font-bold">
        COMMENT: {p.notes.trim() || ptcaCommentSentence(p)}
      </p>

      <div className="text-right">
        <p className="font-bold">{p.lab.doctorName || '____'}</p>
        <p className="text-[11px] text-muted">Consultant Interventional Cardiologist &amp; Asst. Professor</p>
      </div>
    </div>
  )
}
