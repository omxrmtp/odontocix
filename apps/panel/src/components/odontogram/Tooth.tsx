import type { ToothStatus } from './types'

export type ToothType = 'incisor' | 'canine' | 'premolar' | 'molar'

interface ToothProps {
  fdiCode: string
  status: ToothStatus
  onClick?: () => void
  toothType: ToothType
  isUpper?: boolean
}

const statusColors: Record<ToothStatus, { fill: string; stroke: string; indicator?: string }> = {
  sano: { fill: '#fefce8', stroke: '#a1a1aa' },
  caries: { fill: '#fef2f2', stroke: '#dc2626', indicator: 'url(#caries-pattern)' },
  ausente: { fill: '#e5e7eb', stroke: '#9ca3af' },
  implante: { fill: '#eff6ff', stroke: '#2563eb', indicator: 'url(#implante-pattern)' },
  corona: { fill: '#fffbeb', stroke: '#d97706', indicator: 'url(#corona-pattern)' },
  endodoncia: { fill: '#f5f3ff', stroke: '#7c3aed', indicator: 'url(#endo-pattern)' },
  extraccion: { fill: '#f3f4f6', stroke: '#4b5563' },
  puente: { fill: '#ecfdf5', stroke: '#059669', indicator: 'url(#puente-pattern)' },
  protesis: { fill: '#fdf2f8', stroke: '#db2777', indicator: 'url(#protesis-pattern)' },
}

const statusLabels: Record<ToothStatus, string> = {
  sano: 'Sano',
  caries: 'Caries',
  ausente: 'Ausente',
  implante: 'Implante',
  corona: 'Corona',
  endodoncia: 'Endodoncia',
  extraccion: 'Extracción',
  puente: 'Puente',
  protesis: 'Prótesis',
}

export default function Tooth({ fdiCode, status, onClick, toothType, isUpper = true }: ToothProps) {
  const color = statusColors[status]
  const label = statusLabels[status]

  const incisorUpperPath = `M6 4 Q20 2 34 4 L34 24 Q20 26 6 24 Z`
  const incisorLowerPath = `M6 56 Q20 58 34 56 L34 36 Q20 34 6 36 Z`
  const incisorRootUpper = `M10 24 Q20 22 30 24 L26 48 Q20 50 14 48 Z`
  const incisorRootLower = `M10 36 Q20 38 30 36 L26 12 Q20 10 14 12 Z`

  const canineUpperPath = `M10 4 Q20 2 30 4 L34 18 Q20 14 6 18 Z`
  const canineLowerPath = `M10 56 Q20 58 30 56 L34 42 Q20 46 6 42 Z`
  const canineRootUpper = `M8 18 Q20 14 32 18 L28 50 Q20 52 12 50 Z`
  const canineRootLower = `M8 42 Q20 46 32 42 L28 10 Q20 8 12 10 Z`

  const premolarUpperPath = `M6 4 Q20 2 34 4 L36 16 Q28 14 20 16 Q12 14 4 16 Z`
  const premolarLowerPath = `M6 56 Q20 58 34 56 L36 44 Q28 46 20 44 Q12 46 4 44 Z`
  const premolarRootUpper = `M6 16 Q20 14 34 16 L30 48 Q20 50 10 48 Z`
  const premolarRootLower = `M6 44 Q20 46 34 44 L30 12 Q20 10 10 12 Z`

  const molarUpperPath = `M4 4 Q20 2 36 4 L38 20 Q28 18 20 20 Q12 18 2 20 Z`
  const molarLowerPath = `M4 56 Q20 58 36 56 L38 40 Q28 42 20 40 Q12 42 2 40 Z`
  const molarRootUpper = `M6 20 Q20 18 34 20 L30 50 Q24 52 20 50 Q16 52 10 50 Z`
  const molarRootLower = `M6 40 Q20 42 34 40 L30 10 Q24 8 20 10 Q16 8 10 10 Z`

  function getToothPaths(type: ToothType, upper: boolean) {
    switch (type) {
      case 'incisor':
        return { crown: upper ? incisorUpperPath : incisorLowerPath, root: upper ? incisorRootUpper : incisorRootLower }
      case 'canine':
        return { crown: upper ? canineUpperPath : canineLowerPath, root: upper ? canineRootUpper : canineRootLower }
      case 'premolar':
        return { crown: upper ? premolarUpperPath : premolarLowerPath, root: upper ? premolarRootUpper : premolarRootLower }
      case 'molar':
        return { crown: upper ? molarUpperPath : molarLowerPath, root: upper ? molarRootUpper : molarRootLower }
    }
  }

  const { crown, root } = getToothPaths(toothType, isUpper)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex flex-col items-center ${onClick ? 'cursor-pointer' : 'cursor-default'} transition-transform ${onClick ? 'hover:scale-110' : ''}`}
      title={`Diente ${fdiCode}: ${label}${status !== 'sano' ? ' (${label})' : ''}`}
    >
      <svg width="44" height="56" viewBox="0 0 40 60" className="drop-shadow-sm">
        <defs>
          {/* Caries pattern - red spots */}
          <pattern id="caries-pattern" patternUnits="userSpaceOnUse" width="10" height="10">
            <circle cx="3" cy="3" r="2" fill="#ef4444" opacity="0.6" />
            <circle cx="7" cy="8" r="1.5" fill="#dc2626" opacity="0.5" />
          </pattern>
          {/* Implant pattern - screw lines */}
          <pattern id="implante-pattern" patternUnits="userSpaceOnUse" width="6" height="4">
            <line x1="0" y1="2" x2="6" y2="2" stroke="#3b82f6" strokeWidth="0.5" />
          </pattern>
          {/* Crown pattern - gold lines */}
          <pattern id="corona-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
            <line x1="0" y1="4" x2="8" y2="4" stroke="#d97706" strokeWidth="0.5" />
            <line x1="4" y1="0" x2="4" y2="8" stroke="#d97706" strokeWidth="0.5" />
          </pattern>
          {/* Endo pattern - purple center line */}
          <pattern id="endo-pattern" patternUnits="userSpaceOnUse" width="4" height="10">
            <line x1="2" y1="0" x2="2" y2="10" stroke="#7c3aed" strokeWidth="1" />
          </pattern>
          {/* Bridge pattern - green connector */}
          <pattern id="puente-pattern" patternUnits="userSpaceOnUse" width="12" height="6">
            <rect x="0" y="2" width="12" height="2" fill="#10b981" opacity="0.4" />
          </pattern>
          {/* Prosthesis pattern - pink overlay */}
          <pattern id="protesis-pattern" patternUnits="userSpaceOnUse" width="10" height="10">
            <rect x="0" y="0" width="5" height="5" fill="#ec4899" opacity="0.2" />
            <rect x="5" y="5" width="5" height="5" fill="#ec4899" opacity="0.2" />
          </pattern>
        </defs>

        {/* Root */}
        <path
          d={root}
          fill={color.fill}
          stroke={color.stroke}
          strokeWidth="1"
          opacity={status === 'ausente' ? 0.2 : 0.6}
        />

        {/* Crown */}
        <path
          d={crown}
          fill={color.indicator || color.fill}
          stroke={color.stroke}
          strokeWidth="1.5"
        />

        {/* Status indicator overlays */}
        {status === 'ausente' && (
          <g>
            <line x1="10" y1="10" x2="30" y2="50" stroke="#6b7280" strokeWidth="2" />
            <line x1="30" y1="10" x2="10" y2="50" stroke="#6b7280" strokeWidth="2" />
          </g>
        )}

        {status === 'extraccion' && (
          <line x1="8" y1="8" x2="32" y2="52" stroke="#4b5563" strokeWidth="2" opacity="0.7" />
        )}

        {status === 'implante' && (
          <g>
            <line x1="18" y1="28" x2="18" y2="48" stroke="#2563eb" strokeWidth="2" strokeDasharray="3,2" />
            <rect x="14" y="44" width="8" height="4" rx="1" fill="#2563eb" opacity="0.8" />
          </g>
        )}

        {status === 'corona' && (
          <rect x="6" y="4" width="28" height="8" rx="2" fill="#f59e0b" opacity="0.6" />
        )}

        {status === 'endodoncia' && (
          <line x1="18" y1="28" x2="18" y2="50" stroke="#7c3aed" strokeWidth="2" />
        )}
      </svg>

      {/* FDI Code label */}
      <span className={`text-[10px] font-semibold mt-0.5 ${status === 'ausente' ? 'text-gray-400' : 'text-muted-foreground'}`}>
        {fdiCode}
      </span>
    </button>
  )
}
