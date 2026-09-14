import type { AngioFinding, Vessel } from '@/types/procedure'
import { findingSeverity } from '@/lib/format'

export type TreeBranch = {
  vessel: Vessel
  d: string
  label: string
  lx: number
  ly: number
}

export const TREE_VIEWBOX = { w: 440, h: 280 }

export const CORONARY_TREE: TreeBranch[] = [
  { vessel: 'LMCA', d: 'M218 50 C192 68 174 86 158 108', label: 'LMCA', lx: 188, ly: 70 },
  { vessel: 'LAD', d: 'M158 108 C154 150 164 198 176 252', label: 'LAD', lx: 186, ly: 210 },
  { vessel: 'D1', d: 'M156 140 L108 158', label: 'D1', lx: 70, ly: 166 },
  { vessel: 'D2', d: 'M162 180 L112 202', label: 'D2', lx: 86, ly: 206 },
  { vessel: 'D3', d: 'M170 218 L126 242', label: 'D3', lx: 100, ly: 252 },
  { vessel: 'S1', d: 'M154 152 L198 172', label: 'S1', lx: 202, ly: 184 },
  { vessel: 'LCX', d: 'M158 108 C124 122 90 148 58 192', label: 'LCX', lx: 28, ly: 206 },
  { vessel: 'OM1', d: 'M132 118 L100 92', label: 'OM1', lx: 72, ly: 88 },
  { vessel: 'OM2', d: 'M102 142 L64 122', label: 'OM2', lx: 36, ly: 118 },
  { vessel: 'OM3', d: 'M78 168 L38 156', label: 'OM3', lx: 8, ly: 152 },
  { vessel: 'Ramus', d: 'M156 112 L118 128', label: 'RI', lx: 108, ly: 118 },
  { vessel: 'RCA', d: 'M330 48 C344 96 338 156 308 250', label: 'RCA', lx: 356, ly: 142 },
  { vessel: 'Conus', d: 'M338 70 L386 54', label: 'Conus', lx: 360, ly: 48 },
  { vessel: 'AM', d: 'M336 128 L290 110', label: 'AM', lx: 264, ly: 106 },
  { vessel: 'PDA', d: 'M318 216 L268 254', label: 'PDA', lx: 238, ly: 260 },
  { vessel: 'PLV', d: 'M324 200 L374 242', label: 'PLV', lx: 378, ly: 254 },
]

export function unmarkedStroke(): string {
  return '#d7dde6'
}

export function findingStroke(finding: AngioFinding): string {
  const n = findingSeverity(finding)
  if (n >= 90) return '#fb7185'
  if (n >= 50) return '#fbbf24'
  if (n > 0) return '#34d399'
  return '#64748b'
}

export function interactiveStroke(finding?: AngioFinding): string {
  if (!finding) return '#ccd5e1'
  return findingStroke(finding)
}

export function buildCoronarySvg(
  findings: AngioFinding[],
  mode: 'interactive' | 'export',
): string {
  const byVessel = new Map(findings.map((f) => [f.vessel, f]))
  const branches = CORONARY_TREE.map((b) => {
    const finding = byVessel.get(b.vessel)
    const marked = Boolean(finding)
    const color =
      mode === 'export'
        ? marked && finding
          ? findingStroke(finding)
          : unmarkedStroke()
        : interactiveStroke(finding)
    const showLabel = mode === 'interactive' || marked
    const target = Boolean(finding?.isTarget)
    const label = showLabel
      ? `<text x="${b.lx}" y="${b.ly}" fill="#10172a" font-size="12" font-weight="600" font-family="Inter, ui-sans-serif, system-ui, sans-serif">${escapeXml(target ? `★ ${b.label}` : b.label)}</text>`
      : ''
    return `<g><path d="${b.d}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/>${label}</g>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TREE_VIEWBOX.w} ${TREE_VIEWBOX.h}" width="${TREE_VIEWBOX.w}" height="${TREE_VIEWBOX.h}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <text x="20" y="26" fill="#10172a" font-size="12" font-family="Inter, ui-sans-serif, system-ui, sans-serif">Left</text>
  <text x="348" y="26" fill="#10172a" font-size="12" font-family="Inter, ui-sans-serif, system-ui, sans-serif">Right</text>
  ${branches}
</svg>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
