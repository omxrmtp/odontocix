import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
// Checkbox no existe en shadcn local, usamos input nativo
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import MobileCardList from '@/components/app/MobileCardList'
import { toast } from 'sonner'
import { availableSlotsApi, doctorsApi, blockedDatesApi } from '@/lib/endpoints'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import { CalendarDays, Trash2, Plus, ChevronLeft, ChevronRight, Clock, Ban, Pencil } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

const WEEKDAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

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
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5])
  const [skipBlocked, setSkipBlocked] = useState(true)

  const [selectedSlots, setSelectedSlots] = useState<Set<number>>(new Set())
  const [editSlotDialog, setEditSlotDialog] = useState(false)
  const [editSlot, setEditSlot] = useState<any>(null)

  const [blockedDialog, setBlockedDialog] = useState(false)
  const [blockedForm, setBlockedForm] = useState({ date: '', reason: '' })

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

  // Slots del mes para indicadores del calendario
  const monthStart = selectedDate ? startOfMonth(selectedDate) : null
  const monthEnd = selectedDate ? endOfMonth(selectedDate) : null
  const { data: monthSlots } = useQuery({
    queryKey: ['available-slots-month', selectedDoctorId, monthStart?.toISOString()],
    queryFn: () =>
      availableSlotsApi.list({
        doctor_id: selectedDoctorId || undefined,
        start: monthStart ? format(monthStart, 'yyyy-MM-dd') : undefined,
        end: monthEnd ? format(monthEnd, 'yyyy-MM-dd') : undefined,
        all: '1',
      } as Record<string, string>),
    enabled: !!monthStart && !!monthEnd,
  })

  const { data: blockedDates, isPending: loadingBlocked } = useQuery({
    queryKey: ['blocked-dates', monthStart?.toISOString()],
    queryFn: () =>
      blockedDatesApi.list({
        start: monthStart ? format(monthStart, 'yyyy-MM-dd') : undefined,
        end: monthEnd ? format(monthEnd, 'yyyy-MM-dd') : undefined,
      }),
    enabled: !!monthStart && !!monthEnd,
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => availableSlotsApi.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] })
      queryClient.invalidateQueries({ queryKey: ['available-slots-month'] })
      setDialogOpen(false)
      toast.success(res?.message || 'Horarios creados')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al crear horarios'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => availableSlotsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] })
      queryClient.invalidateQueries({ queryKey: ['available-slots-month'] })
      toast.success('Horario eliminado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al eliminar'),
  })

  const batchDeleteMutation = useMutation({
    mutationFn: (ids: number[]) => availableSlotsApi.batchDelete(ids),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] })
      queryClient.invalidateQueries({ queryKey: ['available-slots-month'] })
      setSelectedSlots(new Set())
      toast.success(res?.message || 'Horarios eliminados')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al eliminar'),
  })

  const updateSlotMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => availableSlotsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-slots'] })
      queryClient.invalidateQueries({ queryKey: ['available-slots-month'] })
      setEditSlotDialog(false)
      toast.success('Horario actualizado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al actualizar'),
  })

  const createBlockedMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => blockedDatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] })
      queryClient.invalidateQueries({ queryKey: ['available-slots-month'] })
      setBlockedForm({ date: '', reason: '' })
      toast.success('Fecha bloqueada')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al bloquear fecha'),
  })

  const deleteBlockedMutation = useMutation({
    mutationFn: (id: number) => blockedDatesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] })
      queryClient.invalidateQueries({ queryKey: ['available-slots-month'] })
      toast.success('Fecha desbloqueada')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al desbloquear'),
  })

  const toggleWeekday = (day: number) => {
    setWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const setTimePreset = (preset: 'morning' | 'afternoon' | 'full') => {
    const presets = {
      morning: { start_time: '09:00', end_time: '12:00' },
      afternoon: { start_time: '14:00', end_time: '18:00' },
      full: { start_time: '09:00', end_time: '18:00' },
    }
    setForm(f => ({ ...f, ...presets[preset] }))
  }

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
      weekdays: weekdays.join(','),
      skip_blocked: skipBlocked,
    })
  }

  const toggleSlotSelection = (id: number) => {
    setSelectedSlots(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllSlots = () => {
    const allIds = (slots ?? []).map((s: any) => s.id)
    const allSelected = allIds.every((id: number) => selectedSlots.has(id))
    if (allSelected) {
      setSelectedSlots(prev => {
        const next = new Set(prev)
        allIds.forEach((id: number) => next.delete(id))
        return next
      })
    } else {
      setSelectedSlots(prev => {
        const next = new Set(prev)
        allIds.forEach((id: number) => next.add(id))
        return next
      })
    }
  }

  const openEditSlot = (slot: any) => {
    setEditSlot(slot)
    setEditSlotDialog(true)
  }

  const handleUpdateSlot = () => {
    if (!editSlot) return
    updateSlotMutation.mutate({
      id: editSlot.id,
      data: {
        doctor_id: editSlot.doctor_id ? Number(editSlot.doctor_id) : undefined,
        date: editSlot.date || undefined,
        start_time: editSlot.start_time || undefined,
        end_time: editSlot.end_time || undefined,
        is_available: editSlot.is_available,
      },
    })
  }

  const handleCreateBlocked = () => {
    if (!blockedForm.date) return toast.error('Selecciona una fecha')
    createBlockedMutation.mutate({
      date: blockedForm.date,
      reason: blockedForm.reason || null,
    })
  }

  // Calendario: indicadores
  const datesWithSlots = useMemo(() => {
    const dates = new Set<string>()
    ;(monthSlots ?? []).forEach((s: any) => {
      if (s.date) dates.add(s.date)
    })
    return dates
  }, [monthSlots])

  const blockedDatesSet = useMemo(() => {
    const dates = new Set<string>()
    ;(blockedDates ?? []).forEach((d: any) => {
      if (d.date) dates.add(d.date)
    })
    return dates
  }, [blockedDates])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Disponibilidad</h1>
        <div className="flex gap-2">
          {canEditSlots && (
            <Button variant="outline" onClick={() => setBlockedDialog(true)}>
              <Ban className="h-4 w-4 mr-1" /> Fechas bloqueadas
            </Button>
          )}
          {canEditSlots && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Crear horarios
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="shrink-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={es}
            modifiers={{
              hasSlots: (date) => datesWithSlots.has(format(date, 'yyyy-MM-dd')),
              blocked: (date) => blockedDatesSet.has(format(date, 'yyyy-MM-dd')),
            }}
            modifiersClassNames={{
              hasSlots: 'bg-sky-100 text-sky-700 font-semibold',
              blocked: 'bg-red-100 text-red-700 line-through opacity-70',
            }}
          />
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Con horarios
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Bloqueada
            </span>
          </div>
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

            {canEditSlots && selectedSlots.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => batchDeleteMutation.mutate(Array.from(selectedSlots))}>
                <Trash2 className="h-4 w-4 mr-1" /> Eliminar {selectedSlots.size}
              </Button>
            )}
          </div>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (slots ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm py-6">No hay horarios para esta fecha.</p>
          ) : (
            <>
            <div className="overflow-x-auto rounded-lg border hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canEditSlots && (
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={(slots ?? []).length > 0 && (slots ?? []).every((s: any) => selectedSlots.has(s.id))}
                          onChange={toggleAllSlots}
                        />
                      </TableHead>
                    )}
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
                      {canEditSlots && (
                        <TableCell className="w-10">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300"
                            checked={selectedSlots.has(slot.id)}
                            onChange={() => toggleSlotSelection(slot.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>{slot.date}</TableCell>
                      <TableCell>{slot.start_time}</TableCell>
                      <TableCell>{slot.end_time}</TableCell>
                      <TableCell>
                        {slot.doctor ? `Dr. ${slot.doctor.first_name} ${slot.doctor.first_last_name}` : '-'}
                      </TableCell>
                      <TableCell>
                        {slot.is_booked ? (
                          <Badge variant="destructive">Reservado</Badge>
                        ) : slot.is_available ? (
                          <Badge variant="default" className="bg-sky-100 text-sky-700 hover:bg-sky-100">Disponible</Badge>
                        ) : (
                          <Badge variant="secondary">No disponible</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {canEditSlots && (
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon-sm" onClick={() => openEditSlot(slot)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(slot.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <MobileCardList
              items={slots ?? []}
              keyFn={(s: any) => s.id}
              renderCard={(s: any) => (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{s.date}</span>
                    {s.is_booked ? (
                      <Badge variant="destructive">Reservado</Badge>
                    ) : s.is_available ? (
                      <Badge variant="default" className="bg-sky-100 text-sky-700 hover:bg-sky-100">Disponible</Badge>
                    ) : (
                      <Badge variant="secondary">No disponible</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.start_time} - {s.end_time}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {s.doctor ? `Dr. ${s.doctor.first_name} ${s.doctor.first_last_name}` : '-'}
                  </div>
                  {canEditSlots && (
                    <div className="flex gap-1 pt-1">
                      <Button variant="outline" size="sm" onClick={() => openEditSlot(s)}>
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(s.id)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                      </Button>
                    </div>
                  )}
                </>
              )}
            />
            </>
          )}
        </div>
      </div>

      {/* Dialog: Crear horarios */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear horarios</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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

            <div className="space-y-2">
              <Label>Días de la semana</Label>
              <div className="flex gap-2">
                {WEEKDAYS.map((d) => (
                  <label
                    key={d.value}
                    className={`flex items-center justify-center w-10 h-10 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                      weekdays.includes(d.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-input hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={weekdays.includes(d.value)}
                      onChange={() => toggleWeekday(d.value)}
                      className="sr-only"
                    />
                    {d.label}
                  </label>
                ))}
              </div>
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

            <div className="space-y-1">
              <Label>Rango de horas</Label>
              <div className="flex gap-2 mb-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setTimePreset('morning')} className="flex-1">
                  <Clock className="h-3 w-3 mr-1" /> Mañana
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setTimePreset('afternoon')} className="flex-1">
                  <Clock className="h-3 w-3 mr-1" /> Tarde
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setTimePreset('full')} className="flex-1">
                  Completo
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Inicio</Label>
                  <Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fin</Label>
                  <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Duración por cita</Label>
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

            <div className="flex items-center gap-2">
              <input
                id="skipBlocked"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={skipBlocked}
                onChange={(e) => setSkipBlocked(e.target.checked)}
              />
              <Label htmlFor="skipBlocked" className="text-sm font-normal">
                Omitir fechas bloqueadas (feriados)
              </Label>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGenerateWeek}>
              <CalendarDays className="h-4 w-4 mr-1" /> Generar semana (lun-vie)
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

      {/* Dialog: Editar slot */}
      <Dialog open={editSlotDialog} onOpenChange={setEditSlotDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar horario</DialogTitle>
          </DialogHeader>
          {editSlot && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Doctor</Label>
                <Select value={String(editSlot.doctor_id ?? '')} onValueChange={(v) => setEditSlot((s: any) => ({ ...s, doctor_id: v }))}>
                  <SelectTrigger>
                    <SelectValue />
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
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input type="date" value={editSlot.date} onChange={(e) => setEditSlot((s: any) => ({ ...s, date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Inicio</Label>
                  <Input type="time" value={editSlot.start_time} onChange={(e) => setEditSlot((s: any) => ({ ...s, start_time: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Fin</Label>
                  <Input type="time" value={editSlot.end_time} onChange={(e) => setEditSlot((s: any) => ({ ...s, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="editAvailable"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={editSlot.is_available}
                  onChange={(e) => setEditSlot((s: any) => ({ ...s, is_available: e.target.checked }))}
                />
                <Label htmlFor="editAvailable" className="text-sm font-normal">Disponible</Label>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditSlotDialog(false)}>Cancelar</Button>
            <Button disabled={updateSlotMutation.isPending} onClick={handleUpdateSlot}>
              {updateSlotMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Fechas bloqueadas */}
      <Dialog open={blockedDialog} onOpenChange={setBlockedDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Fechas bloqueadas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agregar fecha bloqueada</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={blockedForm.date} onChange={(e) => setBlockedForm(f => ({ ...f, date: e.target.value }))} />
                <Input placeholder="Motivo (opcional)" value={blockedForm.reason} onChange={(e) => setBlockedForm(f => ({ ...f, reason: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleCreateBlocked} disabled={createBlockedMutation.isPending}>
                {createBlockedMutation.isPending ? 'Guardando...' : 'Bloquear fecha'}
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Label>Registro de fechas bloqueadas</Label>
              {loadingBlocked ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : (blockedDates ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay fechas bloqueadas.</p>
              ) : (
                <div className="space-y-2">
                  {(blockedDates ?? []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
                      <div>
                        <span className="font-medium">{d.date}</span>
                        {d.reason && <span className="text-muted-foreground ml-2">{d.reason}</span>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteBlockedMutation.mutate(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockedDialog(false)}>Cerrar</Button>
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
