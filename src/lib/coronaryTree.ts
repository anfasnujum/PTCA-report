import type { AngioFinding, Vessel } from '@/types/procedure'

export type TreeBranch = {
  vessel: Vessel
  d: string
  label: string
  lx: number
  ly: number
}

export const TREE_VIEWBOX = { w: 440, h: 280 }

export const CORONARY_TREE: TreeBranch[] = [
  { vessel: 'LMCA', d: 'M110 48 C86 66 72 84 66 112', label: 'LMCA', lx: 22, ly: 82 },
  { vessel: 'LAD', d: 'M66 112 C60 152 70 192 88 248', label: 'LAD', lx: 22, ly: 198 },
  { vessel: 'D1', d: 'M70 138 L122 166', label: 'D1', lx: 128, ly: 144 },
  { vessel: 'D2', d: 'M74 176 L128 202', label: 'D2', lx: 132, ly: 206 },
  { vessel: 'D3', d: 'M82 214 L138 236', label: 'D3', lx: 142, ly: 242 },
  { vessel: 'S1', d: 'M60 142 L20 164', label: 'S1', lx: 6, ly: 180 },
  { vessel: 'LCX', d: 'M66 112 C114 132 154 158 192 210', label: 'LCX', lx: 210, ly: 168 },
  { vessel: 'OM1', d: 'M122 146 L164 130', label: 'OM1', lx: 168, ly: 124 },
  { vessel: 'OM2', d: 'M152 174 L200 158', label: 'OM2', lx: 204, ly: 154 },
  { vessel: 'OM3', d: 'M174 198 L224 184', label: 'OM3', lx: 228, ly: 180 },
  { vessel: 'Ramus', d: 'M86 118 L140 102', label: 'RI', lx: 144, ly: 98 },
  { vessel: 'RCA', d: 'M340 48 C354 96 348 156 316 250', label: 'RCA', lx: 366, ly: 142 },
  { vessel: 'Conus', d: 'M348 70 L396 54', label: 'Conus', lx: 370, ly: 48 },
  { vessel: 'AM', d: 'M346 128 L298 110', label: 'AM', lx: 272, ly: 106 },
  { vessel: 'PDA', d: 'M328 216 L274 254', label: 'PDA', lx: 244, ly: 260 },
  { vessel: 'PLV', d: 'M334 200 L384 242', label: 'PLV', lx: 388, ly: 254 },
]

export function unmarkedStroke(): string {
  return '#d7dde6'
}

export function findingStroke(finding: AngioFinding): string {
  if (finding.stenosis >= 90) return '#fb7185'
  if (finding.stenosis >= 50) return '#fbbf24'
  if (finding.stenosis > 0) return '#34d399'
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
