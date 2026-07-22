import { useState } from 'react'
import Tooth from './Tooth'
import ToothDialog from './ToothDialog'
import type { OdontogramData, QuadrantConfig, ToothData, ToothStatus } from './types'

const permanentQuadrants: QuadrantConfig[] = [
  { label: 'Superior Derecho', codes: ['18','17','16','15','14','13','12','11'], section: 'upper-right', prefix: '1' },
  { label: 'Superior Izquierdo', codes: ['21','22','23','24','25','26','27','28'], section: 'upper-left', prefix: '2' },
  { label: 'Inferior Izquierdo', codes: ['31','32','33','34','35','36','37','38'], section: 'lower-left', prefix: '3' },
  { label: 'Inferior Derecho', codes: ['48','47','46','45','44','43','42','41'], section: 'lower-right', prefix: '4' },
]

const deciduousQuadrants: QuadrantConfig[] = [
  { label: 'Temporal Superior Derecho', codes: ['55','54','53','52','51'], section: 'upper-right', prefix: '5' },
  { label: 'Temporal Superior Izquierdo', codes: ['61','62','63','64','65'], section: 'upper-left', prefix: '6' },
  { label: 'Temporal Inferior Izquierdo', codes: ['71','72','73','74','75'], section: 'lower-left', prefix: '7' },
  { label: 'Temporal Inferior Derecho', codes: ['85','84','83','82','81'], section: 'lower-right', prefix: '8' },
]

interface OdontogramProps {
  data: OdontogramData
  onUpdate: (fdiCode: string, data: Partial<ToothData>) => void
  readOnly?: boolean
}

function getToothType(code: string): 'incisor' | 'canine' | 'premolar' | 'molar' {
  if (['11','12','21','22','31','32','41','42','51','52','61','62','71','72','81','82'].includes(code)) return 'incisor'
  if (['13','23','33','43','53','63','73','83'].includes(code)) return 'canine'
  if (['14','15','24','25','34','35','44','45','54','55','64','65','74','75','84','85'].includes(code)) return 'premolar'
  return 'molar'
}

const statusLabels: Record<ToothStatus, string> = {
  sano: 'Sano', caries: 'Caries', ausente: 'Ausente', implante: 'Implante',
  corona: 'Corona', endodoncia: 'Endodoncia', extraccion: 'Extracción',
  puente: 'Puente', protesis: 'Prótesis',
}

export default function Odontogram({ data, onUpdate, readOnly = false }: OdontogramProps) {
  const [selected, setSelected] = useState<{ fdiCode: string; tooth: ToothData } | null>(null)

  const getStatus = (code: string): ToothStatus => data[code]?.status ?? 'sano'

  const handleToothClick = (code: string) => {
    if (readOnly) return
    setSelected({ fdiCode: code, tooth: data[code] ?? { fdiCode: code, status: 'sano' } })
  }

  return (
    <div className="space-y-6">
      {/* Permanent teeth */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-muted-foreground text-center">Dientes Permanentes</h4>

        {/* Upper arch */}
        <div className="bg-muted/20 rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground text-center mb-2">Arcada Superior</p>
          <div className="flex flex-wrap justify-center gap-x-0 gap-y-1">
            {/* Right side: 18→11 */}
            {permanentQuadrants[0].codes.map((code) => (
              <Tooth
                key={code}
                fdiCode={code}
                status={getStatus(code)}
                onClick={() => handleToothClick(code)}
                toothType={getToothType(code)}
                isUpper={true}
              />
            ))}
            {/* Divider */}
            <div className="w-4" />
            {/* Left side: 21→28 */}
            {permanentQuadrants[1].codes.map((code) => (
              <Tooth
                key={code}
                fdiCode={code}
                status={getStatus(code)}
                onClick={() => handleToothClick(code)}
                toothType={getToothType(code)}
                isUpper={true}
              />
            ))}
          </div>
        </div>

        {/* Lower arch */}
        <div className="bg-muted/20 rounded-xl p-4 space-y-1">
          <div className="flex flex-wrap justify-center gap-x-0 gap-y-1">
            {/* Right side: 48→41 */}
            {permanentQuadrants[3].codes.map((code) => (
              <Tooth
                key={code}
                fdiCode={code}
                status={getStatus(code)}
                onClick={() => handleToothClick(code)}
                toothType={getToothType(code)}
                isUpper={false}
              />
            ))}
            {/* Divider */}
            <div className="w-4" />
            {/* Left side: 31→38 */}
            {permanentQuadrants[2].codes.map((code) => (
              <Tooth
                key={code}
                fdiCode={code}
                status={getStatus(code)}
                onClick={() => handleToothClick(code)}
                toothType={getToothType(code)}
                isUpper={false}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Arcada Inferior</p>
        </div>
      </div>

      {/* Deciduous teeth */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-muted-foreground text-center">Dientes Temporales (Deciduos)</h4>

        {/* Upper deciduous */}
        <div className="bg-muted/20 rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground text-center mb-2">Arcada Superior Temporal</p>
          <div className="flex flex-wrap justify-center gap-x-0 gap-y-1">
            {deciduousQuadrants[0].codes.map((code) => (
              <Tooth
                key={code}
                fdiCode={code}
                status={getStatus(code)}
                onClick={() => handleToothClick(code)}
                toothType={getToothType(code)}
                isUpper={true}
              />
            ))}
            <div className="w-4" />
            {deciduousQuadrants[1].codes.map((code) => (
              <Tooth
                key={code}
                fdiCode={code}
                status={getStatus(code)}
                onClick={() => handleToothClick(code)}
                toothType={getToothType(code)}
                isUpper={true}
              />
            ))}
          </div>
        </div>

        {/* Lower deciduous */}
        <div className="bg-muted/20 rounded-xl p-4 space-y-1">
          <div className="flex flex-wrap justify-center gap-x-0 gap-y-1">
            {deciduousQuadrants[3].codes.map((code) => (
              <Tooth
                key={code}
                fdiCode={code}
                status={getStatus(code)}
                onClick={() => handleToothClick(code)}
                toothType={getToothType(code)}
                isUpper={false}
              />
            ))}
            <div className="w-4" />
            {deciduousQuadrants[2].codes.map((code) => (
              <Tooth
                key={code}
                fdiCode={code}
                status={getStatus(code)}
                onClick={() => handleToothClick(code)}
                toothType={getToothType(code)}
                isUpper={false}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">Arcada Inferior Temporal</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground justify-center pt-2 border-t">
        {Object.entries(statusLabels).map(([key, label]) => {
          const colorMap: Record<string, string> = {
            sano: 'bg-green-100 border-green-400',
            caries: 'bg-red-100 border-red-400',
            ausente: 'bg-gray-200 border-gray-400',
            implante: 'bg-blue-100 border-blue-400',
            corona: 'bg-amber-100 border-amber-400',
            endodoncia: 'bg-purple-100 border-purple-400',
            extraccion: 'bg-gray-300 border-gray-500',
            puente: 'bg-emerald-100 border-emerald-400',
            protesis: 'bg-pink-100 border-pink-400',
          }
          return (
            <span key={key} className="flex items-center gap-1">
              <span className={`inline-block w-3 h-3 rounded-sm ${(colorMap[key] ?? 'bg-gray-100 border-gray-300').split(' ')[0]} border`} />
              {label}
            </span>
          )
        })}
      </div>

      <ToothDialog
        fdiCode={selected?.fdiCode ?? null}
        tooth={selected?.tooth ?? null}
        onClose={() => setSelected(null)}
        onSave={(fdiCode, toothData) => {
          onUpdate(fdiCode, toothData)
          setSelected(null)
        }}
      />
    </div>
  )
}
