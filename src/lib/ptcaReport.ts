import { fmtSize, formatSegments, vesselReportName } from '@/lib/format'
import { hasStentEvents } from '@/lib/noteTemplate'
import type { Access, AngioFinding, LabDetails, Outcome, Periprocedural, Procedure } from '@/types/procedure'

function shortVesselCode(vessel: string): string {
  return vessel === 'LMCA' ? 'LM' : vessel
}

function targetLabel(
  f: Pick<AngioFinding, 'vessel' | 'segment' | 'omMajor' | 'lcxParent'>,
  repeatVessel: boolean,
): string {
  const name = shortVesselCode(vesselReportName(f))
  if (!repeatVessel) return name
  const phrase = formatSegments(f.segment)
  return phrase ? `${phrase} ${name}` : name
}

function labelledTargets(targets: AngioFinding[]): string[] {
  const counts = new Map<string, number>()
  for (const f of targets) {
    const key = vesselReportName(f)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return targets.map((f) => targetLabel(f, (counts.get(vesselReportName(f)) ?? 0) > 1))
}

export function targetVesselsShort(procedure: Procedure): string {
  const targets = procedure.baselineAngio.filter((f) => f.isTarget)
  if (!targets.length) return '____'
  return labelledTargets(targets).join(' - ')
}

export function ptcaTitle(procedure: Procedure): string {
  return hasStentEvents(procedure.events) ? 'PTCA & STENTING REPORT' : 'PTCA REPORT'
}

export function accessShortCode(access: Access): string {
  const sideCode = access.side === 'right' ? 'R' : access.side === 'left' ? 'L' : ''
  const siteCode =
    access.site === 'radial' || access.site === 'distal radial'
      ? 'R'
      : access.site === 'femoral'
        ? 'F'
        : access.site === 'brachial'
          ? 'B'
          : access.site === 'ulnar'
            ? 'U'
            : ''
  if (!sideCode || !siteCode) return '____'
  return `${sideCode}${siteCode}A`
}

export function ptcaInventorySummary(procedure: Procedure): string {
  const targets = procedure.baselineAngio.filter((f) => f.isTarget)
  if (!targets.length) return 'PTCA'
  return `PTCA ${labelledTargets(targets).join(' to ')}`
}

export function ptcaInventoryLines(procedure: Procedure): Array<{ label: string; value: string }> {
  const lines: Array<{ label: string; value: string }> = []
  if (procedure.access.sheathSize) {
    lines.push({ label: 'Sheath', value: procedure.access.sheathSize })
  }
  for (const e of procedure.events) {
    switch (e.kind) {
      case 'guideCatheter':
        lines.push({ label: 'Guiding Catheter', value: `${e.data.size} ${e.data.curve}` })
        break
      case 'guidewire':
        lines.push({ label: 'Guide wire', value: `0.014" ${e.data.name} ${e.data.type}` })
        break
      case 'predilatation':
        lines.push({
          label: 'Pre-dilation balloon',
          value: `${fmtSize(e.data.diameterMm, e.data.lengthMm)} ${e.data.name} @ ${e.data.inflations.map((i) => i.atm).join(',')}atm`,
        })
        break
      case 'stent':
        lines.push({
          label: 'Stent',
          value: `${fmtSize(e.data.diameterMm, e.data.lengthMm)} ${e.data.name} @ ${e.data.deployedAtAtm}atm`,
        })
        break
      case 'postdilatation':
        lines.push({
          label: 'Post-dilatation balloon',
          value: `${fmtSize(e.data.diameterMm, e.data.lengthMm)} ${e.data.name} @ ${e.data.inflations.map((i) => i.atm).join(',')}atm`,
        })
        break
      default:
        break
    }
  }
  return lines
}

export function ptcaResultLabel(outcome: Outcome): string {
  return outcome.residualStenosis === 0 && outcome.finalTimiFlow === 3 ? 'Good' : 'Suboptimal'
}

export function ptcaComplicationsText(outcome: Outcome): string {
  const comps = outcome.complications.filter((c) => c && c !== 'none')
  return comps.length ? comps.join(', ') : 'Nil'
}

export function ptcaAdjuvantsText(peri: Periprocedural): string {
  const bits: string[] = []
  if (peri.heparinIU !== '') bits.push(`Heparin ${peri.heparinIU} units`)
  if (peri.gp2b3a && peri.gp2b3a !== 'none') bits.push(`GP IIb/IIIa: ${peri.gp2b3a}`)
  return bits.length ? bits.join(', ') : '____'
}

export function ptcaContrastText(peri: Periprocedural): string {
  if (!peri.contrastAgent && peri.contrastVolumeMl === '') return '____'
  const vol = peri.contrastVolumeMl === '' ? '' : ` ${peri.contrastVolumeMl} ml`
  return `${peri.contrastAgent || 'Contrast'}${vol}`
}

export function ptcaHemodynamicText(lab: LabDetails): string {
  if (lab.haemodynamicData.trim()) return lab.haemodynamicData.trim()
  if (lab.aorticPressureMmHg.trim()) return `Aortic: Pre PTCA: ${lab.aorticPressureMmHg} mmHg`
  return '____'
}

export function ptcaCommentSentence(procedure: Procedure): string {
  const verb = hasStentEvents(procedure.events) ? 'PTCA WITH STENTING OF' : 'PTCA OF'
  return `${verb} ${targetVesselsShort(procedure).toUpperCase()} WAS DONE SUCCESSFULLY`
}
