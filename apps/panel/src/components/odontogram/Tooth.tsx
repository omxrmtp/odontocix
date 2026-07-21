import type { ToothStatus } from './types'

interface ToothProps {
  fdiCode: string
  status: ToothStatus
  onClick: () => void
  toothType: 'incisor' | 'canine' | 'premolar' | 'molar'
}

const statusColors: Record<ToothStatus, string> = {
  sano: '#ffffff',
  caries: '#ef4444',
  ausente: '#d1d5db',
  implante: '#3b82f6',
  corona: '#f59e0b',
  endodoncia: '#8b5cf6',
  extraccion: '#6b7280',
  puente: '#10b981',
  protesis: '#ec4899',
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

export default function Tooth({ fdiCode, status, onClick }: ToothProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center cursor-pointer transition-transform hover:scale-110"
      title={`Diente ${fdiCode}: ${statusLabels[status]}`}
    >
      <svg width="36" height="48" viewBox="0 0 36 48" className="drop-shadow-sm">
        <rect
          x="2" y="4" width="32" height="40" rx="8" ry="8"
          fill={status === 'ausente' ? '#e5e7eb' : statusColors[status]}
          stroke={status === 'sano' ? '#9ca3af' : '#374151'}
          strokeWidth="1.5"
          fillOpacity={status === 'ausente' ? 0.3 : 1}
        />
        <path
          d="M8 4 Q18 0 28 4"
          fill="none"
          stroke={status === 'sano' ? '#9ca3af' : '#374151'}
          strokeWidth="1.5"
        />
        <path
          d="M8 44 Q18 48 28 44"
          fill="none"
          stroke={status === 'sano' ? '#9ca3af' : '#374151'}
          strokeWidth="1.5"
        />
        <line
          x1="18" y1="8" x2="18" y2="40"
          stroke={status === 'sano' ? '#d1d5db' : '#374151'}
          strokeWidth="0.5"
          opacity={status === 'ausente' ? 0.2 : 1}
        />
      </svg>
      <span className="text-[10px] text-muted-foreground mt-0.5">{fdiCode}</span>
    </button>
  )
}
