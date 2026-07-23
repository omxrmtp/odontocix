import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { portalApi, downloadPortalHistoryPdf, downloadPortalReceipt } from '@/lib/endpoints'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CalendarDays, Phone, FileText, User, Clock, CreditCard, Download, MessageCircle, ChevronRight, X, Pencil, Trash2, FileSignature, CheckCircle2, Stethoscope } from 'lucide-react'

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

function appointmentStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    scheduled: 'outline',
    confirmed: 'default',
    in_progress: 'secondary',
    completed: 'default',
    cancelled: 'destructive',
  }
  return map[status] ?? 'outline'
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

function treatmentStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    pending: 'outline',
    in_progress: 'secondary',
    completed: 'default',
    cancelled: 'destructive',
  }
  return map[status] ?? 'outline'
}

function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    other: 'Otros',
  }
  return map[method] ?? method
}

function SignaturePad({ onSave, onCancel }: { onSave: (dataUrl: string) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }, [])

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          className="w-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clear}>Limpiar</Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" disabled={!hasDrawn} onClick={() => {
          const canvas = canvasRef.current
          if (canvas) onSave(canvas.toDataURL())
        }}>Confirmar firma</Button>
      </div>
    </div>
  )
}

export default function PatientPortalPage() {
  const { token } = useParams<{ token: string }>()
  const queryClient = useQueryClient()
  const [pdfLoading, setPdfLoading] = useState(false)

  const [editContactOpen, setEditContactOpen] = useState(false)
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')

  const [cancelConfirm, setCancelConfirm] = useState<number | null>(null)

  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookDoctorId, setBookDoctorId] = useState<string | null>(null)
  const [bookDate, setBookDate] = useState<Date | undefined>(undefined)
  const [bookSlotId, setBookSlotId] = useState<string | null>(null)
  const [bookReason, setBookReason] = useState('')

  const [signForm, setSignForm] = useState<number | null>(null)

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

  const { data: payments } = useQuery({
    queryKey: ['portal-payments', token],
    queryFn: () => portalApi.payments(token!),
    enabled: Boolean(token) && Boolean(patient),
  })

  const { data: doctors } = useQuery({
    queryKey: ['portal-doctors', token],
    queryFn: () => portalApi.doctors(token!),
    enabled: Boolean(token) && Boolean(patient) && bookingOpen,
  })

  const { data: availableSlots } = useQuery({
    queryKey: ['portal-slots', token, bookDoctorId, bookDate],
    queryFn: () => portalApi.slots(token!, { doctor_id: bookDoctorId!, date: format(bookDate!, 'yyyy-MM-dd') }),
    enabled: Boolean(token) && Boolean(patient) && !!bookDoctorId && !!bookDate && bookingOpen,
  })

  const { data: consentForms } = useQuery({
    queryKey: ['portal-consent-forms', token],
    queryFn: () => portalApi.consentForms(token!),
    enabled: Boolean(token) && Boolean(patient),
  })

  useEffect(() => {
    if (patientError) {
      toast.error('No se pudo cargar la información del paciente.')
    }
  }, [patientError])

  const updateContactMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => portalApi.updatePatient(token!, data),
    onSuccess: (data) => {
      queryClient.setQueryData(['portal-patient', token], (old: any) => ({ ...old, phone: data.phone, email: data.email }))
      setEditContactOpen(false)
      toast.success('Datos actualizados con éxito.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar datos.'),
  })

  const cancelAppointmentMutation = useMutation({
    mutationFn: (id: number) => portalApi.cancelAppointment(token!, id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-appointments', token] })
      setCancelConfirm(null)
      toast.success(data.message ?? 'Cita cancelada.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al cancelar cita.'),
  })

  const bookMutation = useMutation({
    mutationFn: () => portalApi.bookAppointment(token!, {
      slot_id: bookSlotId,
      doctor_id: bookDoctorId,
      reason: bookReason || undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-appointments', token] })
      setBookingOpen(false)
      setBookDoctorId(null)
      setBookDate(undefined)
      setBookSlotId(null)
      setBookReason('')
      toast.success(data.message ?? 'Cita reservada con éxito.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al reservar cita.'),
  })

  const signMutation = useMutation({
    mutationFn: ({ formId, signature }: { formId: number; signature: string }) =>
      portalApi.signConsentForm(token!, formId, { signature_data: signature }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portal-consent-forms', token] })
      setSignForm(null)
      toast.success(data.message ?? 'Formulario firmado con éxito.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al firmar formulario.'),
  })

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

  const handleDownloadReceipt = async (paymentId: number) => {
    if (!token) return
    try {
      const blob = await downloadPortalReceipt(token, paymentId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-${paymentId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar el recibo.')
    }
  }

  const whatsappLink = patient?.tenant_phone
    ? `https://wa.me/${String(patient.tenant_phone).replace(/\D/g, '')}`
    : null

  const fullName = [patient?.first_name, patient?.second_name, patient?.first_last_name, patient?.second_last_name]
    .filter(Boolean)
    .join(' ')

  const futureAppointments = (appointments ?? []).filter((a: any) => a.status !== 'cancelled' && new Date(a.start_date) >= new Date())
  const pastAppointments = (appointments ?? []).filter((a: any) => a.status === 'cancelled' || new Date(a.start_date) < new Date())

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

  const selectedDoctor = doctors?.find((d: any) => String(d.id) === bookDoctorId)
  const selectedSlot = availableSlots?.find((s: any) => String(s.id) === bookSlotId)

  return (
    <div className="min-h-screen bg-muted/30 pb-8">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="max-w-2xl mx-auto">
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

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Quick actions */}
        <div className="flex gap-2 flex-wrap">
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex-1 min-w-[140px]">
              <Button variant="outline" className="w-full gap-2">
                <MessageCircle className="w-4 h-4" />
                Contactar
              </Button>
            </a>
          )}
          <Button variant="outline" className="flex-1 min-w-[140px] gap-2" onClick={handleDownloadPdf} disabled={pdfLoading}>
            <Download className="w-4 h-4" />
            {pdfLoading ? 'Descargando...' : 'Descargar historia'}
          </Button>
        </div>

        {/* Personal data */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Datos personales
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setEditPhone(patient.phone ?? ''); setEditEmail(patient.email ?? ''); setEditContactOpen(true) }}>
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </Button>
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

        {/* Reservar cita */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Reservar cita
            </CardTitle>
            <Button size="sm" onClick={() => setBookingOpen(!bookingOpen)}>
              {bookingOpen ? 'Cerrar' : 'Nueva cita'}
            </Button>
          </CardHeader>
          {bookingOpen && (
            <CardContent className="space-y-4">
              {/* Doctor selection */}
              <div className="space-y-2">
                <Label>Doctor</Label>
                <div className="grid gap-2">
                  {(doctors ?? []).map((d: any) => (
                    <div
                      key={d.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${bookDoctorId === String(d.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => { setBookDoctorId(String(d.id)); setBookDate(undefined); setBookSlotId(null) }}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Stethoscope className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.specialty || 'Odontología General'}</p>
                      </div>
                      {bookDoctorId === String(d.id) && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Date selection */}
              {bookDoctorId && (
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={bookDate}
                      onSelect={(d) => { setBookDate(d); setBookSlotId(null) }}
                      locale={es}
                      fromDate={new Date()}
                    />
                  </div>
                </div>
              )}

              {/* Slot selection */}
              {bookDoctorId && bookDate && (
                <div className="space-y-2">
                  <Label>Horario</Label>
                  {!availableSlots || availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No hay horarios disponibles para esta fecha.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlots.map((s: any) => (
                        <Button
                          key={s.id}
                          variant={bookSlotId === String(s.id) ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setBookSlotId(String(s.id))}
                        >
                          {s.start_time} - {s.end_time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reason + book */}
              {bookDoctorId && bookDate && bookSlotId && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Motivo (opcional)</Label>
                    <Input value={bookReason} onChange={e => setBookReason(e.target.value)} placeholder="Dolor de muela, revisión..." />
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 space-y-1">
                    <p><span className="font-medium">Doctor:</span> {selectedDoctor?.name}</p>
                    <p><span className="font-medium">Fecha:</span> {bookDate && format(bookDate, 'dd/MM/yyyy')}</p>
                    <p><span className="font-medium">Horario:</span> {selectedSlot?.start_time} - {selectedSlot?.end_time}</p>
                  </div>
                  <Button className="w-full" onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending}>
                    {bookMutation.isPending ? 'Reservando...' : 'Reservar cita'}
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Appointments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Mis citas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {futureAppointments.length === 0 && pastAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No tienes citas registradas.</p>
            ) : (
              <div className="space-y-3">
                {futureAppointments.map((a: any) => (
                  <div key={a.id} className="flex items-start justify-between gap-2 border-b pb-2 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{a.reason || 'Cita programada'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatDateTime(a.start_date)}
                        {a.doctor_name && <span>· {a.doctor_name}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={appointmentStatusVariant(a.status)} className="text-xs">{appointmentStatusLabel(a.status)}</Badge>
                      {a.can_cancel && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setCancelConfirm(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {pastAppointments.length > 0 && (
                  <>
                    <details className="group">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                        {pastAppointments.length} cita{pastAppointments.length !== 1 ? 's' : ''} anterior{ pastAppointments.length !== 1 ? 'es' : ''}
                      </summary>
                      <div className="mt-2 space-y-2">
                        {pastAppointments.map((a: any) => (
                          <div key={a.id} className="flex items-start justify-between gap-2 border-b pb-2 last:border-0">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm">{a.reason || 'Cita'}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(a.start_date)}{a.doctor_name && ` · ${a.doctor_name}`}</p>
                            </div>
                            <Badge variant={appointmentStatusVariant(a.status)} className="text-xs shrink-0">{appointmentStatusLabel(a.status)}</Badge>
                          </div>
                        ))}
                      </div>
                    </details>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treatment timeline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-primary" />
              Plan de tratamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!historyData?.treatments || historyData.treatments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No hay tratamientos registrados.</p>
            ) : (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-primary/20" />
                {historyData.treatments
                  .slice()
                  .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((t: any, idx: number) => (
                    <div key={t.id} className="relative">
                      <div className={`absolute -left-[18px] top-1 w-2.5 h-2.5 rounded-full border-2 ${t.status === 'completed' ? 'bg-green-500 border-green-500' : t.status === 'in_progress' ? 'bg-blue-500 border-blue-500' : 'bg-background border-muted-foreground'}`} />
                      <div className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{t.treatment_name || 'Tratamiento'}</p>
                          <Badge variant={treatmentStatusVariant(t.status)} className="text-xs shrink-0">{treatmentStatusLabel(t.status)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.doctor_name && <span>{t.doctor_name}</span>}
                          {t.tooth_fdi && <span> · Diente {t.tooth_fdi}</span>}
                          {t.created_at && <span> · {formatDate(t.created_at)}</span>}
                        </p>
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

        {/* Payments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Mis pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!payments || payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No hay pagos registrados.</p>
            ) : (
              <div className="space-y-3">
                {payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 border-b last:border-0 pb-2 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">S/ {Number(p.amount).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.payment_date)}
                        {p.method && <span> · {paymentMethodLabel(p.method)}</span>}
                        {p.reference && p.reference !== '-' && <span> · Ref: {p.reference}</span>}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={() => handleDownloadReceipt(p.id)}>
                      <Download className="w-3.5 h-3.5" />
                      Recibo
                    </Button>
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

        {/* Consent forms */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-primary" />
              Consentimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!consentForms || consentForms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No hay formularios pendientes.</p>
            ) : (
              <div className="space-y-3">
                {consentForms.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 border-b last:border-0 pb-2 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.signed ? `Firmado el ${formatDate(f.signed_at)}` : 'Pendiente de firma'}
                      </p>
                    </div>
                    {!f.signed ? (
                      <Button size="sm" onClick={() => setSignForm(f.id)}>
                        Firmar
                      </Button>
                    ) : (
                      <Badge variant="default" className="text-xs">Firmado</Badge>
                    )}
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

      {/* Edit Contact Dialog */}
      <Dialog open={editContactOpen} onOpenChange={setEditContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar datos de contacto</DialogTitle>
            <DialogDescription>Actualiza tu teléfono o correo electrónico.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="987654321" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="paciente@example.com" type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContactOpen(false)}>Cancelar</Button>
            <Button onClick={() => updateContactMutation.mutate({ phone: editPhone || null, email: editEmail || null })} disabled={updateContactMutation.isPending}>
              {updateContactMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirm Dialog */}
      <Dialog open={!!cancelConfirm} onOpenChange={(o) => !o && setCancelConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancelar cita</DialogTitle>
            <DialogDescription>¿Estás seguro de cancelar esta cita?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelConfirm(null)}>No, mantener</Button>
            <Button variant="destructive" onClick={() => cancelConfirm && cancelAppointmentMutation.mutate(cancelConfirm)} disabled={cancelAppointmentMutation.isPending}>
              {cancelAppointmentMutation.isPending ? 'Cancelando...' : 'Sí, cancelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Consent Form Dialog */}
      <Dialog open={!!signForm} onOpenChange={(o) => !o && setSignForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firmar consentimiento</DialogTitle>
            <DialogDescription>Firma en el recuadro usando el mouse o tu dedo.</DialogDescription>
          </DialogHeader>
          <SignaturePad
            onSave={(signature) => signForm && signMutation.mutate({ formId: signForm, signature })}
            onCancel={() => setSignForm(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
