import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { onlineBookingApi } from '@/lib/endpoints'
import {
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MessageCircle,
  CalendarDays,
  Clock,
  User,
} from 'lucide-react'

export default function OnlineBookingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tenantId = searchParams.get('tenant_id') || ''

  const [step, setStep] = useState(1)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [patientName, setPatientName] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [patientDni, setPatientDni] = useState('')
  const [reason, setReason] = useState('')
  const [appointment, setAppointment] = useState<any>(null)
  const [inputTenant, setInputTenant] = useState('')

  const { data: doctors, isPending: loadingDoctors } = useQuery({
    queryKey: ['online-doctors', tenantId],
    queryFn: () => onlineBookingApi.doctors(tenantId),
    enabled: !!tenantId,
  })

  const { data: slots, isPending: loadingSlots } = useQuery({
    queryKey: ['online-slots', tenantId, selectedDoctorId, selectedDate],
    queryFn: () =>
      onlineBookingApi.slots({
        tenant_id: tenantId,
        doctor_id: selectedDoctorId!,
        date: format(selectedDate!, 'yyyy-MM-dd'),
      }),
    enabled: !!tenantId && !!selectedDoctorId && !!selectedDate,
  })

  const bookMutation = useMutation({
    mutationFn: () =>
      onlineBookingApi.book({
        tenant_id: tenantId,
        slot_id: selectedSlotId,
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail || undefined,
        patient_dni: patientDni,
        reason: reason || undefined,
      }),
    onSuccess: (data) => {
      setAppointment(data.appointment)
      setStep(6)
      toast.success(data.message)
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Error al reservar la cita')
    },
  })

  const selectedDoctor = doctors?.find((d: any) => String(d.id) === selectedDoctorId)
  const selectedSlot = slots?.find((s: any) => String(s.id) === selectedSlotId)

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-4 pt-6">
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold">Reservar cita</h1>
              <p className="text-sm text-muted-foreground">Ingresa el código de tu clínica para continuar</p>
            </div>
            <Input
              placeholder="Código de clínica"
              value={inputTenant}
              onChange={(e) => setInputTenant(e.target.value)}
            />
            <Button className="w-full" onClick={() => setSearchParams({ tenant_id: inputTenant })}>
              Continuar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 6 && appointment) {
    const waNumber = appointment.tenant_phone?.replace(/\D/g, '')
    const waMessage = encodeURIComponent(
      `Hola, reservé una cita en ${appointment.tenant_name || 'su clínica'} el ${appointment.slot.date} a las ${appointment.slot.start_time}.`
    )
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 pt-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h1 className="text-2xl font-bold">Cita reservada</h1>
            <p className="text-muted-foreground">Tu cita ha sido confirmada con éxito.</p>
            <div className="text-left space-y-2 rounded-lg bg-muted/50 p-4 text-sm">
              <p><span className="font-medium">Doctor:</span> {appointment.doctor_name}</p>
              <p><span className="font-medium">Fecha:</span> {appointment.slot.date}</p>
              <p><span className="font-medium">Hora:</span> {appointment.slot.start_time} - {appointment.slot.end_time}</p>
              <p><span className="font-medium">Paciente:</span> {appointment.patient_name}</p>
              <p><span className="font-medium">Motivo:</span> {appointment.reason || 'No especificado'}</p>
            </div>
            {waNumber && (
              <a
                href={`https://wa.me/${waNumber}?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-600 font-medium hover:underline"
              >
                <MessageCircle className="h-4 w-4" />
                Contactar por WhatsApp
              </a>
            )}
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              Reservar otra cita
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Reservar cita</h1>
          <p className="text-sm text-muted-foreground">Paso {step} de 5</p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Stethoscope className="h-5 w-5" /> Selecciona un doctor
            </h2>
            {loadingDoctors ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="grid gap-3">
                {(doctors ?? []).map((d: any) => (
                  <Card
                    key={d.id}
                    className={`cursor-pointer transition-colors ${selectedDoctorId === String(d.id) ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedDoctorId(String(d.id))}
                  >
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Stethoscope className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{d.name}</p>
                        <p className="text-sm text-muted-foreground">{d.specialty || 'Odontología'}</p>
                        <Badge variant="outline" className="mt-1 text-xs">CMP: {d.cmp}</Badge>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Button
              className="w-full"
              disabled={!selectedDoctorId}
              onClick={() => setStep(2)}
            >
              Continuar <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Selecciona una fecha
            </h2>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={es}
                fromDate={new Date()}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" /> Atrás
              </Button>
              <Button className="flex-1" disabled={!selectedDate} onClick={() => setStep(3)}>
                Continuar <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Clock className="h-5 w-5" /> Selecciona un horario
            </h2>
            {loadingSlots ? (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : (slots ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay horarios disponibles para esta fecha.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {(slots ?? []).map((s: any) => (
                  <Button
                    key={s.id}
                    variant={selectedSlotId === String(s.id) ? 'default' : 'outline'}
                    className="w-full"
                    onClick={() => setSelectedSlotId(String(s.id))}
                  >
                    {s.start_time} - {s.end_time}
                  </Button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4" /> Atrás
              </Button>
              <Button className="flex-1" disabled={!selectedSlotId} onClick={() => setStep(4)}>
                Continuar <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <User className="h-5 w-5" /> Tus datos
            </h2>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Nombre completo</Label>
                <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Juan Pérez" />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="987654321" />
              </div>
              <div className="space-y-1">
                <Label>Correo electrónico</Label>
                <Input value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} placeholder="juan@example.com" />
              </div>
              <div className="space-y-1">
                <Label>DNI</Label>
                <Input value={patientDni} onChange={(e) => setPatientDni(e.target.value)} placeholder="12345678" />
              </div>
              <div className="space-y-1">
                <Label>Motivo de consulta</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Dolor de muela" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(3)}>
                <ChevronLeft className="h-4 w-4" /> Atrás
              </Button>
              <Button
                className="flex-1"
                disabled={!patientName || !patientPhone || !patientDni}
                onClick={() => setStep(5)}
              >
                Continuar <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">Confirma tu cita</h2>
            <Card>
              <CardContent className="space-y-2 pt-4 text-sm">
                <p><span className="font-medium">Doctor:</span> {selectedDoctor?.name}</p>
                <p><span className="font-medium">Fecha:</span> {selectedDate && format(selectedDate, 'dd/MM/yyyy')}</p>
                <p><span className="font-medium">Hora:</span> {selectedSlot?.start_time} - {selectedSlot?.end_time}</p>
                <p><span className="font-medium">Paciente:</span> {patientName}</p>
                <p><span className="font-medium">Teléfono:</span> {patientPhone}</p>
                <p><span className="font-medium">DNI:</span> {patientDni}</p>
                <p><span className="font-medium">Motivo:</span> {reason || 'No especificado'}</p>
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(4)}>
                <ChevronLeft className="h-4 w-4" /> Atrás
              </Button>
              <Button
                className="flex-1"
                disabled={bookMutation.isPending}
                onClick={() => bookMutation.mutate()}
              >
                {bookMutation.isPending ? 'Reservando...' : 'Reservar cita'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
