import { useState } from 'react'
import Tooth from './Tooth'
import ToothDialog from './ToothDialog'
import type { OdontogramData, QuadrantConfig, ToothData, ToothStatus } from './types'

const permanentQuadrants: QuadrantConfig[] = [
  { label: 'Superior Derecho', codes: ['18','17','16','15','14','13','12','11'], section: 'upper-right', prefix: '1' },
  { label: 'Superior Izquierdo', codes: ['21','22','23','24','25','26','27','28'], section: 'upper-left', prefix: '2' },
  { label: 'Inferior Izquierdo', codes: ['31','32','33','34','35','36','37','38'], section: 'lower-left', prefix: '3' },
  { label: 'Inferior Derecho', codes: ['41','42','43','44','45','46','47','48'], section: 'lower-right', prefix: '4' },
]

const deciduousQuadrants: QuadrantConfig[] = [
  { label: 'Temporal Superior Derecho', codes: ['55','54','53','52','51'], section: 'upper-right', prefix: '5' },
  { label: 'Temporal Superior Izquierdo', codes: ['61','62','63','64','65'], section: 'upper-left', prefix: '6' },
  { label: 'Temporal Inferior Izquierdo', codes: ['71','72','73','74','75'], section: 'lower-left', prefix: '7' },
  { label: 'Temporal Inferior Derecho', codes: ['81','82','83','84','85'], section: 'lower-right', prefix: '8' },
]

interface OdontogramProps {
  data: OdontogramData
  onUpdate: (fdiCode: string, data: Partial<ToothData>) => void
}

export default function Odontogram({ data, onUpdate }: OdontogramProps) {
  const [selected, setSelected] = useState<{ fdiCode: string; tooth: ToothData } | null>(null)

  const getStatus = (code: string): ToothStatus => data[code]?.status ?? 'sano'

  return (
    <div className="space-y-6">
      {[permanentQuadrants, deciduousQuadrants].map((quadrants, idx) => (
        <div key={idx} className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">
            {idx === 0 ? 'Permanentes' : 'Temporales'}
          </h4>
          <div className="grid grid-cols-2 gap-6">
            {quadrants.map((q) => (
              <div key={q.label} className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">{q.label}</p>
                <div className="flex justify-center gap-0.5">
                  {q.codes.map((code) => (
                    <Tooth
                      key={code}
                      fdiCode={code}
                      status={getStatus(code)}
                      onClick={() => setSelected({ fdiCode: code, tooth: data[code] ?? { fdiCode: code, status: 'sano' } })}
                      toothType={
                        ['11','12','21','22','31','32','41','42','51','52','61','62','71','72','81','82'].includes(code)
                          ? 'incisor'
                          : ['13','23','33','43','53','63','73','83'].includes(code)
                          ? 'canine'
                          : ['14','15','24','25','34','35','44','45','54','55','64','65','74','75','84','85'].includes(code)
                          ? 'premolar'
                          : 'molar'
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

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
