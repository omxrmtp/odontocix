import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ToothData, ToothStatus } from './types'

const statuses: { value: ToothStatus; label: string; color: string }[] = [
  { value: 'sano', label: 'Sano', color: 'bg-white border border-gray-300' },
  { value: 'caries', label: 'Caries', color: 'bg-red-500' },
  { value: 'ausente', label: 'Ausente', color: 'bg-gray-300' },
  { value: 'implante', label: 'Implante', color: 'bg-blue-500' },
  { value: 'corona', label: 'Corona', color: 'bg-amber-500' },
  { value: 'endodoncia', label: 'Endodoncia', color: 'bg-purple-500' },
  { value: 'extraccion', label: 'Extracción', color: 'bg-gray-500' },
  { value: 'puente', label: 'Puente', color: 'bg-emerald-500' },
  { value: 'protesis', label: 'Prótesis', color: 'bg-pink-500' },
]

interface ToothDialogProps {
  fdiCode: string | null
  tooth: ToothData | null
  onClose: () => void
  onSave: (fdiCode: string, data: Partial<ToothData>) => void
}

export default function ToothDialog({ fdiCode, tooth, onClose, onSave }: ToothDialogProps) {
  const [status, setStatus] = useState<ToothStatus>('sano')
  const [surface, setSurface] = useState('')
  const [notes, setNotes] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (fdiCode) {
      setStatus(tooth?.status ?? 'sano')
      setSurface(tooth?.surface ?? '')
      setNotes(tooth?.notes ?? '')
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [fdiCode, tooth])

  const handleSave = () => {
    if (fdiCode) onSave(fdiCode, { fdiCode, status, surface, notes })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Diente {fdiCode}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <div className="flex flex-wrap gap-2">
              {statuses.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    status === s.value
                      ? 'ring-2 ring-primary ring-offset-2'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="surface">Superficie afectada</Label>
            <Select value={surface} onValueChange={setSurface}>
              <SelectTrigger id="surface">
                <SelectValue placeholder="Seleccionar superficie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vestibular">Vestibular</SelectItem>
                <SelectItem value="palatina">Palatina</SelectItem>
                <SelectItem value="lingual">Lingual</SelectItem>
                <SelectItem value="mesial">Mesial</SelectItem>
                <SelectItem value="distal">Distal</SelectItem>
                <SelectItem value="oclusal">Oclusal</SelectItem>
                <SelectItem value="toda">Toda la pieza</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observaciones</Label>
            <textarea
              id="notes"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
