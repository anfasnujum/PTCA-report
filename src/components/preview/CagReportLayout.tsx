import { cagAdviceItems, cagArterialGraftLine, cagImpressionItems, fmtDisplayDate } from '@/lib/format'
import { accessNarrative, accessSpecialNote } from '@/lib/access'
import { mainVesselLabel, mainVesselParagraph } from '@/lib/noteTemplate'
import type { Procedure } from '@/types/procedure'

function FieldCell({ label, value }: { label: string; value: string }) {
  return (
    <td className="px-1.5 py-0.5 align-top text-[10px] font-normal">
      {label} : {value || '____'}
    </td>
  )
}

function ListedField({ label, items }: { label: string; items: string[] }) {
  if (!items.length) {
    return (
      <p>
        <span className="font-bold">{label}</span> : Not recorded.
      </p>
    )
  }
  return (
    <div>
      <p>
        <span className="font-bold">{label}</span> :
      </p>
      <ul className="my-0 list-disc pl-8">
        {items.map((item, i) => (
          <li key={`${label}-${i}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function FieldLine({ label, value, tabs = 0 }: { label: string; value: string; tabs?: number }) {
  return (
    <p className="py-0.5 text-[10px] font-normal" style={{ paddingLeft: `${0.375 + tabs * 2}em` }}>
      {label} : {value || '____'}
    </p>
  )
}

export function CagReportLayout({ procedure }: { procedure: Procedure }) {
  const p = procedure
  const lmca = mainVesselParagraph(p.baselineAngio, 'LMCA')
  const lad = mainVesselParagraph(p.baselineAngio, 'LAD')
  const lcx = mainVesselParagraph(p.baselineAngio, 'LCX')
  const lcxLabel = mainVesselLabel(p.baselineAngio, 'LCX')
  const rca = mainVesselParagraph(p.baselineAngio, 'RCA')
  const limaLine = cagArterialGraftLine('LIMA', p.cagLimaOn, p.cagLimaNote)
  const rimaLine = cagArterialGraftLine('RIMA', p.cagRimaOn, p.cagRimaNote)
  const impressionItems = cagImpressionItems(p.cagImpressions, p.cagCustomImpressions)
  const adviceItems = cagAdviceItems(p.cagAdvices, p.cagCustomAdvices)
  const accessText = accessNarrative(p.access, { includeSheath: false })
  const specialNotes = accessSpecialNote(p.access)
  const aorticPressure = p.lab.aorticPressureMmHg.trim()
    ? /mm\s*hg$/i.test(p.lab.aorticPressureMmHg.trim())
      ? p.lab.aorticPressureMmHg.trim()
      : `${p.lab.aorticPressureMmHg.trim()} mmHg`
    : ''

  return (
    <div
      className="report-doc cag-report space-y-2 rounded-2xl bg-card p-6 text-[13px] leading-snug shadow-card"
      style={{ fontFamily: "'Times New Roman', Times, serif" }}
    >
      <div className="text-center">
        <h2 className="text-lg font-bold uppercase tracking-wide">Coronary Angiography Report</h2>
        <p className="mt-1">
          <span className="font-semibold">Consultant: </span>
          {p.lab.doctorName || '____'}
        </p>
      </div>
      <hr className="border-t border-border" />

      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <FieldCell label="Name" value={p.patient.name.toUpperCase()} />
            <FieldCell label="Age" value={p.patient.age === '' ? '' : String(p.patient.age)} />
            <FieldCell label="Sex" value={p.patient.sex} />
            <FieldCell label="Cath no" value={p.patient.hospitalId} />
          </tr>
          <tr>
            <FieldCell label="Date" value={fmtDisplayDate(p.patient.date)} />
            <FieldCell label="Cath Tech" value={p.lab.technologist} />
            <FieldCell label="IP No" value={p.patient.ipNo} />
            <FieldCell label="Scrub nurse" value={p.lab.scrubNurse} />
          </tr>
        </tbody>
      </table>

      <div className="border-t border-border pt-2">
        <FieldLine label="Access" value={accessText} tabs={4} />
        {specialNotes ? <FieldLine label="Special Notes" value={specialNotes} tabs={5} /> : null}
        <FieldLine label="Catheter" value={p.lab.catheter} tabs={4} />
        <FieldLine label="Contrast" value={p.lab.contrast} tabs={4} />
        <p className="py-0.5 text-[10px] font-normal" style={{ paddingLeft: `${0.375 + 2 * 2}em` }}>
          Haemodynamic Data : {p.lab.haemodynamicData.trim() || '____'}
          <span className="inline-block w-6" />
          Aortic Pressure : {aorticPressure || '____'}
        </p>
      </div>

      <div className="space-y-0.5 border-t border-border pt-2">
        <p>
          <span className="font-bold">LMCA</span> : {lmca}
        </p>
        <p>
          <span className="font-bold">LAD</span> : {lad}
        </p>
        {limaLine ? <p>{limaLine}</p> : null}
        <p>
          <span className="font-bold">{lcxLabel}</span> : {lcx}
        </p>
        {rimaLine ? <p>{rimaLine}</p> : null}
        <p>
          <span className="font-bold">RCA</span> : {rca}
        </p>
        <ListedField label="IMPRESSION" items={impressionItems} />
        <ListedField label="ADVICE" items={adviceItems} />
        {p.notes.trim() ? (
          <p>
            <span className="font-bold">FINAL</span> : {p.notes.trim()}
          </p>
        ) : null}
      </div>

      <div className="text-right">
        <p className="font-semibold">{p.lab.doctorName || '____'}</p>
        <p className="text-[11px] text-muted">Consultant Interventional Cardiologist &amp; Asst. Professor</p>
      </div>
    </div>
  )
}
