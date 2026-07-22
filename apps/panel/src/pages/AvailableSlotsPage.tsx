import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { availableSlotsApi, doctorsApi } from '@/lib/endpoints'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import { CalendarDays, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

export default function AvailableSlotsPage() {
  const queryClient = useQueryClient()
  const { canEdit } = usePermission()
  const canEditSlots = canEdit('disponibilidad')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  const [form, setForm] = useState({
    doctor_id: '',
    start_date: '',
    end_date: '',
    start_time: '09:00',
    end_time: '18:00',
    duration_minutes: '30',
  })

  const { data: doctors, isPending: loadingDoctors } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => doctorsApi.list({ per_page: '100' }),
  })

  const { data: slots, isPending: loadingSlots } = useQuery({
    queryKey: ['available-slots', selectedDoctorId, selectedDate],
    queryFn: () =>
      availableSlotsApi.list({
        doctor_id: selectedDoctorId || undefined,
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        all: '1',
      } as Record<string, string>),
    enabled: !!selectedDate,
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => availableSlotsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] })
      setDialogOpen(false)
      toast.success('Horarios creados')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al crear horarios'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => availableSlotsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] })
      toast.success('Horario eliminado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al eliminar'),
  })

  const handleGenerateWeek = () => {
    const today = new Date()
    const nextWeek = new Date()
    nextWeek.setDate(today.getDate() + 6)
    setForm((f) => ({
      ...f,
      start_date: format(today, 'yyyy-MM-dd'),
      end_date: format(nextWeek, 'yyyy-MM-dd'),
    }))
  }

  const handleCreate = () => {
    if (!form.doctor_id || !form.start_date || !form.end_date || !form.start_time || !form.end_time) {
      return toast.error('Completa todos los campos')
    }
    createMutation.mutate({
      doctor_id: Number(form.doctor_id),
      start_date: form.start_date,
      end_date: form.end_date,
      start_time: form.start_time,
      end_time: form.end_time,
      duration_minutes: Number(form.duration_minutes),
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Disponibilidad</h1>
        {canEditSlots && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Crear horarios
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="shrink-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={es}
          />
        </div>

        <div className="flex-1 w-full min-w-0 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder={loadingDoctors ? 'Cargando...' : 'Filtrar por doctor'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los doctores</SelectItem>
                {(doctors?.data ?? []).map((d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    Dr. {d.first_name} {d.first_last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => d ? new Date(d.getTime() - 86400000) : new Date())}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => d ? new Date(d.getTime() + 86400000) : new Date())}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (slots ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm py-6">No hay horarios para esta fecha.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(slots ?? []).map((slot: any) => (
                    <TableRow key={slot.id}>
                      <TableCell>{slot.date}</TableCell>
                      <TableCell>{format(new Date(`1970-01-01T${slot.start_time}`), 'HH:mm')}</TableCell>
                      <TableCell>{format(new Date(`1970-01-01T${slot.end_time}`), 'HH:mm')}</TableCell>
                      <TableCell>
                        {slot.doctor ? `Dr. ${slot.doctor.first_name} ${slot.doctor.first_last_name}` : '-'}
                      </TableCell>
                      <TableCell>
                        {slot.is_booked ? (
                          <Badge variant="destructive">Reservado</Badge>
                        ) : slot.is_available ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">Disponible</Badge>
                        ) : (
                          <Badge variant="secondary">No disponible</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEditSlots && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setConfirmDelete(slot.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear horarios</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Doctor</Label>
              <Select value={form.doctor_id} onValueChange={(v) => setForm((f) => ({ ...f, doctor_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingDoctors ? 'Cargando...' : 'Seleccionar doctor'} />
                </SelectTrigger>
                <SelectContent>
                  {(doctors?.data ?? []).map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      Dr. {d.first_name} {d.first_last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Fecha inicio</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha fin</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Hora inicio</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Hora fin</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Duración (minutos)</Label>
              <Select value={form.duration_minutes} onValueChange={(v) => setForm((f) => ({ ...f, duration_minutes: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGenerateWeek}>
              <CalendarDays className="h-4 w-4 mr-1" /> Generar semana
            </Button>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button disabled={createMutation.isPending} onClick={handleCreate}>
              {createMutation.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar horario"
        description="¿Estás seguro de eliminar este horario? Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />
    </div>
  )
}
