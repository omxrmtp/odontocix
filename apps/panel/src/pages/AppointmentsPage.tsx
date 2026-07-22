import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar } from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { appointmentsApi, patientsApi, doctorsApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import SkeletonTable from '@/components/app/SkeletonTable'
import { usePermission } from '@/hooks/usePermission'

const statusColors: Record<string, string> = {
  scheduled: '#3b82f6',
  confirmed: '#22c55e',
  in_progress: '#f59e0b',
  completed: '#6b7280',
  cancelled: '#ef4444',
  no_show: '#dc2626',
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [form, setForm] = useState({
    patient_id: '', doctor_id: '', start_date: '', end_date: '',
    reason: '', status: 'scheduled',
  })
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [waLinks, setWaLinks] = useState<{ patient_link: string; doctor_link: string } | null>(null)
  const [upcomingDialogOpen, setUpcomingDialogOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const calendarInstance = useRef<Calendar | null>(null)
  const { canEdit } = usePermission()
  const canEditCitas = canEdit('citas')
  const canEditRef = useRef(canEditCitas)
  canEditRef.current = canEditCitas

  const { data: appointments, isPending: loadingApps } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.list(),
  })

  const { data: patients, isPending: loadingPatients } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientsApi.list({ per_page: '100' }),
  })

  const { data: doctors, isPending: loadingDoctors } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => doctorsApi.list({ per_page: '100' }),
  })

  const { data: upcomingReminders, isPending: loadingUpcoming } = useQuery({
    queryKey: ['upcoming-reminders'],
    queryFn: () => appointmentsApi.upcomingReminders(),
    enabled: upcomingDialogOpen,
  })

  const loading = loadingApps || loadingPatients || loadingDoctors

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => appointmentsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); setDialogOpen(false); toast.success('Cita creada') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear cita'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => appointmentsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); setDialogOpen(false); toast.success('Cita actualizada') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => appointmentsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); toast.success('Cita eliminada') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al eliminar'),
  })

  const events = (appointments ?? []).map((a: any) => ({
    id: String(a.id),
    title: `${a.patient?.first_name ?? '?'} ${a.patient?.first_last_name ?? ''}${a.whatsapp_patient_sent ? ' (R)' : ''}`,
    start: a.start_date,
    end: a.end_date,
    backgroundColor: statusColors[a.status] || '#3b82f6',
    extendedProps: a,
  }))

  useEffect(() => {
    if (!calendarRef.current || calendarInstance.current) return
    const isMobile = window.innerWidth < 768
    const cal = new Calendar(calendarRef.current, {
      plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
      initialView: isMobile ? 'listWeek' : 'dayGridMonth',
      locale: 'es',
      height: 'auto',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: isMobile ? 'listWeek' : 'dayGridMonth,dayGridWeek,dayGridDay',
      },
      buttonText: {
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana',
        day: 'Día',
        list: 'Lista',
      },
      windowResize: (view) => {
        if (window.innerWidth < 768) {
          cal.changeView('listWeek')
          cal.setOption('headerToolbar', {
            left: 'prev,next today',
            center: 'title',
            right: 'listWeek',
          })
        } else {
          cal.changeView('dayGridMonth')
          cal.setOption('headerToolbar', {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek,dayGridDay',
          })
        }
      },
      eventClick: (info) => {
        if (!canEditRef.current) return
        openEditRef.current(info.event.extendedProps)
      },
    })
    cal.render()
    calendarInstance.current = cal
    return () => { cal.destroy(); calendarInstance.current = null }
  }, [])

  useEffect(() => {
    if (calendarInstance.current) {
      calendarInstance.current.removeAllEvents()
      calendarInstance.current.addEventSource(events)
    }
  }, [events])

  const openNew = () => {
    setEditId(null)
    setForm({ patient_id: '', doctor_id: '', start_date: '', end_date: '', reason: '', status: 'scheduled' })
    setDialogOpen(true)
  }

  const openEdit = (app: any) => {
    setEditId(app.id)
    setSelectedAppointment(app)
    setForm({
      patient_id: String(app.patient_id),
      doctor_id: String(app.doctor_id ?? ''),
      start_date: app.start_date?.slice(0, 16) ?? '',
      end_date: app.end_date?.slice(0, 16) ?? '',
      reason: app.reason ?? '',
      status: app.status,
    })
    setDialogOpen(true)
    appointmentsApi.whatsappLinks(app.id).then(setWaLinks)
  }

  const openEditRef = useRef(openEdit)
  openEditRef.current = openEdit

  const handleSave = () => {
    if (!form.patient_id) return toast.error('Paciente es requerido')
    if (!form.doctor_id) return toast.error('Doctor es requerido')
    if (!form.start_date) return toast.error('Fecha de inicio es requerida')
    const data = {
      patient_id: Number(form.patient_id),
      doctor_id: form.doctor_id ? Number(form.doctor_id) : null,
      start_date: form.start_date,
      end_date: form.end_date || null,
      reason: form.reason,
      status: form.status,
    }
    if (editId) updateMutation.mutate({ id: editId, data })
    else createMutation.mutate(data)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Citas</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUpcomingDialogOpen(true)}>Recordatorios pendientes</Button>
          {canEditCitas && <Button onClick={openNew}>Nueva cita</Button>}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div ref={calendarRef} style={{ minHeight: 500 }} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? 'Editar cita' : 'Nueva cita'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Paciente</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm(p => ({ ...p, patient_id: v }))}>
                <SelectTrigger><SelectValue placeholder={loadingPatients ? 'Cargando...' : 'Seleccionar paciente'} /></SelectTrigger>
                <SelectContent>
                  {(patients?.data ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.first_name} {p.first_last_name} - {p.dni}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Doctor</Label>
              <Select value={form.doctor_id} onValueChange={(v) => setForm(p => ({ ...p, doctor_id: v }))}>
                <SelectTrigger><SelectValue placeholder={loadingDoctors ? 'Cargando...' : 'Seleccionar doctor'} /></SelectTrigger>
                <SelectContent>
                  {(doctors?.data ?? []).map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>Dr. {d.first_name} {d.first_last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Inicio</Label>
              <Input type="datetime-local" value={form.start_date} onChange={(e) => setForm(p => ({ ...p, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Fin</Label>
              <Input type="datetime-local" value={form.end_date} onChange={(e) => setForm(p => ({ ...p, end_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Input value={form.reason} onChange={(e) => setForm(p => ({ ...p, reason: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Programada</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="in_progress">En curso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedAppointment && (
            <div className="flex items-center gap-2 pt-2">
              {selectedAppointment.whatsapp_patient_sent ? (
                <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Recordatorio enviado</Badge>
              ) : (
                <a href={waLinks?.patient_link ?? '#'} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full text-green-600 border-green-300">
                    Enviar recordatorio
                  </Button>
                </a>
              )}
            </div>
          )}

          {waLinks && (
            <div className="flex gap-2 pt-2">
              <a href={waLinks.patient_link} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full text-green-600 border-green-300">WhatsApp Paciente</Button>
              </a>
              <a href={waLinks.doctor_link} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" className="w-full text-blue-600 border-blue-300">WhatsApp Doctor</Button>
              </a>
            </div>
          )}

          <DialogFooter className="gap-2">
            {editId && canEditCitas && <Button variant="destructive" onClick={() => setConfirmDelete(editId)}>Eliminar</Button>}
            {canEditCitas && <Button onClick={handleSave}>Guardar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar cita"
        description="¿Estás seguro de eliminar esta cita? Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <Dialog open={upcomingDialogOpen} onOpenChange={setUpcomingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Recordatorios pendientes (próximas 48h)</DialogTitle></DialogHeader>
          {loadingUpcoming ? (
            <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(upcomingReminders ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay citas pendientes de recordatorio.</p>
              ) : (
                (upcomingReminders ?? []).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="text-sm">
                      <p className="font-medium">{a.patient?.first_name} {a.patient?.first_last_name}</p>
                      <p className="text-muted-foreground">{new Date(a.start_date).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                    <a href={a.whatsapp_patient_link} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-green-600 border-green-300">Recordar</Button>
                    </a>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
