import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { portalApi, downloadPortalHistoryPdf } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Calendar, Phone, FileText, User, Clock, CreditCard, Download, MessageCircle, ChevronRight } from 'lucide-react'

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  const d = new Date(dateString)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-'
  const d = new Date(dateString)
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function appointmentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'Programada',
    confirmed: 'Confirmada',
    in_progress: 'En progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
  }
  return map[status] ?? status
}

function budgetStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Borrador',
    sent: 'Enviado',
    approved: 'Aprobado',
    rejected: 'Rechazado',
  }
  return map[status] ?? status
}

function budgetStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    sent: 'default',
    approved: 'default',
    rejected: 'destructive',
  }
  return map[status] ?? 'outline'
}

function treatmentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    completed: 'Completado',
    cancelled: 'Cancelado',
  }
  return map[status] ?? status
}

export default function PatientPortalPage() {
  const { token } = useParams<{ token: string }>()
  const [pdfLoading, setPdfLoading] = useState(false)

  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery({
    queryKey: ['portal-patient', token],
    queryFn: () => portalApi.patient(token!),
    enabled: Boolean(token),
  })

  const { data: appointments } = useQuery({
    queryKey: ['portal-appointments', token],
    queryFn: () => portalApi.appointments(token!),
    enabled: Boolean(token) && Boolean(patient),
  })

  const { data: historyData } = useQuery({
    queryKey: ['portal-history', token],
    queryFn: () => portalApi.history(token!),
    enabled: Boolean(token) && Boolean(patient),
  })

  const { data: budgets } = useQuery({
    queryKey: ['portal-budgets', token],
    queryFn: () => portalApi.budgets(token!),
    enabled: Boolean(token) && Boolean(patient),
  })

  useEffect(() => {
    if (patientError) {
      toast.error('No se pudo cargar la información del paciente.')
    }
  }, [patientError])

  const handleDownloadPdf = async () => {
    if (!token) return
    setPdfLoading(true)
    try {
      const blob = await downloadPortalHistoryPdf(token)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `historia-clinica.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar el PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  const whatsappLink = patient?.tenant_phone
    ? `https://wa.me/${String(patient.tenant_phone).replace(/\D/g, '')}`
    : null

  const fullName = [patient?.first_name, patient?.second_name, patient?.first_last_name, patient?.second_last_name]
    .filter(Boolean)
    .join(' ')

  if (patientLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    )
  }

  if (patientError || !patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Enlace no válido</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            El enlace del portal ha expirado o no existe. Contacta a la clínica para más información.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-lg font-semibold opacity-90">{patient.tenant_name ?? 'Portal del Paciente'}</h1>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-base leading-tight">{fullName || 'Paciente'}</p>
              <p className="text-xs opacity-80">DNI: {patient.dni ?? '-'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {/* Quick actions */}
        <div className="flex gap-2">
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <MessageCircle className="w-4 h-4" />
                Confirmar cita
              </Button>
            </a>
          )}
          <Button variant="outline" className="flex-1 gap-2" onClick={handleDownloadPdf} disabled={pdfLoading}>
            <Download className="w-4 h-4" />
            {pdfLoading ? 'Descargando...' : 'Descargar historia'}
          </Button>
        </div>

        {/* Patient info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Datos personales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {patient.phone && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Teléfono</span>
                <span>{patient.phone}</span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="truncate max-w-[180px]">{patient.email}</span>
              </div>
            )}
            {patient.birth_date && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Nacimiento</span>
                <span>{formatDate(patient.birth_date)}</span>
              </div>
            )}
            {patient.blood_type && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tipo de sangre</span>
                <Badge variant="outline">{patient.blood_type}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Próximas citas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!appointments || appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No tienes citas programadas.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((a: any) => (
                  <div key={a.id} className="flex items-start justify-between gap-2 border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{a.reason || 'Cita programada'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(a.start_date)}
                        {a.doctor_name && ` · ${a.doctor_name}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">{appointmentStatusLabel(a.status)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treatments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-primary" />
              Tratamientos recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!historyData?.treatments || historyData.treatments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No hay tratamientos registrados.</p>
            ) : (
              <div className="space-y-3">
                {historyData.treatments.map((t: any) => (
                  <div key={t.id} className="flex items-start justify-between gap-2 border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{t.treatment_name || 'Tratamiento'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.doctor_name && `${t.doctor_name}`}
                        {t.tooth_fdi && ` · Diente ${t.tooth_fdi}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-xs">{treatmentStatusLabel(t.status)}</Badge>
                      {t.agreed_price !== null && (
                        <p className="text-xs text-muted-foreground mt-0.5">S/ {Number(t.agreed_price).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budgets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!budgets || budgets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No hay presupuestos registrados.</p>
            ) : (
              <div className="space-y-3">
                {budgets.map((b: any) => (
                  <div key={b.id} className="border-b last:border-0 pb-2 last:pb-0">
                    <div className="flex items-center justify-between">
                      <Badge variant={budgetStatusVariant(b.status)} className="text-xs">{budgetStatusLabel(b.status)}</Badge>
                      <p className="text-sm font-semibold">S/ {Number(b.grand_total).toFixed(2)}</p>
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {b.items?.map((item: any, idx: number) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          {item.quantity}x {item.treatment_name} — S/ {Number(item.unit_price).toFixed(2)}
                        </p>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-1.5 text-xs">
                      <span className="text-muted-foreground">Pagado: S/ {Number(b.paid_amount).toFixed(2)}</span>
                      <span className={b.balance > 0 ? 'text-destructive font-medium' : 'text-emerald-600 font-medium'}>
                        Saldo: S/ {Number(b.balance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-muted-foreground">
          <p>Portal del Paciente · {patient.tenant_name ?? 'OdontoCix'}</p>
          <p className="mt-1">Si tienes dudas, contacta a la clínica.</p>
        </div>
      </div>
    </div>
  )
}