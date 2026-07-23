import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'

interface PortalUrlDialogProps {
  portalToken: string | null | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  patientName?: string
}

export function PortalUrlDialog({ portalToken, open, onOpenChange, patientName }: PortalUrlDialogProps) {
  const [copied, setCopied] = useState(false)

  if (!portalToken) return null

  const baseUrl = window.location.origin
  const url = `${baseUrl}/portal/${portalToken}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('URL copiada al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Portal del Paciente</DialogTitle>
          <DialogDescription>
            {patientName ? `Enlace para ${patientName}` : 'Comparte este enlace con el paciente para que acceda a su portal.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex justify-center">
            <QRCodeSVG value={url} size={200} level="M" />
          </div>
          <div className="bg-muted rounded-lg p-4 text-center break-all text-sm font-medium select-all">
            {url}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <a href={url} target="_blank" rel="noreferrer" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink className="w-4 h-4" />
                Abrir
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            El paciente puede escanear o copiar este enlace para ver sus citas, tratamientos y presupuestos.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}