import { cagAdviceSentence, cagArterialGraftLine, cagImpressionSentence, fmtDisplayDate } from '@/lib/format'
import { mainVesselParagraph } from '@/lib/noteTemplate'
import type { Procedure } from '@/types/procedure'

function FieldCell({ label, value }: { label: string; value: string }) {
  return (
    <td className="px-1.5 py-0.5 align-top text-[10px] font-normal">
      {label} : {value || '____'}
    </td>
  )
}

export function CagReportLayout({ procedure }: { procedure: Procedure }) {
  const p = procedure
  const lmca = mainVesselParagraph(p.baselineAngio, 'LMCA')
  const lad = mainVesselParagraph(p.baselineAngio, 'LAD')
  const lcx = mainVesselParagraph(p.baselineAngio, 'LCX')
  const rca = mainVesselParagraph(p.baselineAngio, 'RCA')
  const limaLine = cagArterialGraftLine('LIMA', p.cagLimaOn, p.cagLimaNote)
  const rimaLine = cagArterialGraftLine('RIMA', p.cagRimaOn, p.cagRimaNote)
  const impression = cagImpressionSentence(p.cagImpressions, p.cagCustomImpressions)
  const advice = cagAdviceSentence(p.cagAdvices, p.cagCustomAdvices)
  const aorticPressure = p.lab.aorticPressureMmHg ? `${p.lab.aorticPressureMmHg} mmHg` : ''
  const lvedp = p.lab.lvedp ? `${p.lab.lvedp} mmHg` : ''
  const hasExtraHaemo = Boolean(p.lab.haemodynamicData.trim() || aorticPressure || lvedp)

  return (
    <div className="cag-report space-y-2 rounded-2xl bg-card p-6 text-[13px] leading-snug shadow-card">
      <div className="text-center" style={{ marginTop: '6cm' }}>
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

      <table className="w-full border-collapse border-y border-border">
        <tbody>
          <tr>
            <FieldCell label="Inventory" value={p.lab.inventory} />
            <FieldCell label="Access" value={p.lab.access} />
            <FieldCell label="Catheter" value={p.lab.catheter} />
            <FieldCell label="Contrast" value={p.lab.contrast} />
          </tr>
          {hasExtraHaemo ? (
            <tr>
              <FieldCell label="Haemodynamic Data" value={p.lab.haemodynamicData} />
              <FieldCell label="Aortic Pressure" value={aorticPressure} />
              <FieldCell label="LVEDP" value={lvedp} />
              <td className="px-1.5 py-0.5" />
            </tr>
          ) : null}
        </tbody>
      </table>

      <div className="space-y-0.5">
        <p>
          <span className="font-bold">LMCA</span> : {lmca}
        </p>
        <p>
          <span className="font-bold">LAD</span> : {lad}
        </p>
        {limaLine ? <p>{limaLine}</p> : null}
        <p>
          <span className="font-bold">LCX</span> : {lcx}
        </p>
        {rimaLine ? <p>{rimaLine}</p> : null}
        <p>
          <span className="font-bold">RCA</span> : {rca}
        </p>
        <p>
          <span className="font-bold">IMPRESSION</span> : {impression}
        </p>
        <p>
          <span className="font-bold">ADVICE</span> : {advice}
        </p>
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
