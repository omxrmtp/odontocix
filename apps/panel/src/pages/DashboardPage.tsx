import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi, patientsApi, appointmentsApi, cashApi, doctorsApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { usePermission } from '@/hooks/usePermission'
import {
  Users, CalendarDays, DollarSign, TrendingUp, TrendingDown,
  Package, AlertTriangle, Plus, ArrowRight, Wallet
} from 'lucide-react'

const statusColor: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  confirmada: 'bg-green-100 text-green-700',
  completada: 'bg-blue-100 text-blue-700',
  cancelada: 'bg-red-100 text-red-700',
}

const statusLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { canEdit } = usePermission()
  const canEditGeneral = canEdit('pacientes') || canEdit('citas') || canEdit('pagos') || canEdit('caja')

  const { data: stats, isPending: loading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats(),
  })

  const s = stats ?? {}

  // ── Modales ──
  const [modal, setModal] = useState<'patient' | 'appointment' | 'expense' | null>(null)

  // Paciente
  const [patientForm, setPatientForm] = useState({ first_name: '', first_last_name: '', dni: '', phone: '' })
  const createPatient = useMutation({
    mutationFn: (data: any) => patientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setModal(null)
      setPatientForm({ first_name: '', first_last_name: '', dni: '', phone: '' })
      toast.success('Paciente creado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  })

  // Cita
  const { data: doctorsList } = useQuery({ queryKey: ['doctors-list-short'], queryFn: () => doctorsApi.list({ per_page: '100' }) })
  const { data: patientsList } = useQuery({ queryKey: ['patients-list-short'], queryFn: () => patientsApi.list({ per_page: '100' }) })
  const [appointmentForm, setAppointmentForm] = useState({ patient_id: '', doctor_id: '', date: '', time: '09:00' })
  const createAppointment = useMutation({
    mutationFn: (data: any) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setModal(null)
      setAppointmentForm({ patient_id: '', doctor_id: '', date: '', time: '09:00' })
      toast.success('Cita creada')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  })

  // Gasto
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', description: '' })
  const createExpense = useMutation({
    mutationFn: (data: any) => cashApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['cash'] })
      setModal(null)
      setExpenseForm({ category: '', amount: '', description: '' })
      toast.success('Gasto registrado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  })

  // Acciones de citas
  const updateAppointment = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => appointmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Estado actualizado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  })

  const handlePatientSave = () => {
    if (!patientForm.first_name || !patientForm.first_last_name) return toast.error('Nombre y apellido son requeridos')
    createPatient.mutate({
      first_name: patientForm.first_name,
      first_last_name: patientForm.first_last_name,
      dni: patientForm.dni || null,
      phone: patientForm.phone || null,
    })
  }

  const handleAppointmentSave = () => {
    if (!appointmentForm.patient_id || !appointmentForm.doctor_id || !appointmentForm.date) {
      return toast.error('Completa todos los campos')
    }
    const start = `${appointmentForm.date}T${appointmentForm.time}:00`
    const [h, m] = appointmentForm.time.split(':').map(Number)
    const endH = h + 1
    const end = `${appointmentForm.date}T${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
    createAppointment.mutate({
      patient_id: Number(appointmentForm.patient_id),
      doctor_id: Number(appointmentForm.doctor_id),
      start_date: start,
      end_date: end,
      status: 'pendiente',
    })
  }

  const handleExpenseSave = () => {
    if (!expenseForm.category || !expenseForm.amount) return toast.error('Categoría y monto son requeridos')
    createExpense.mutate({
      type: 'expense',
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      description: expenseForm.description || null,
    })
  }

  // Helpers
  const todayAppointments = (s.appointments_today ?? []).slice(0, 6)
  const upcomingAppointments = (s.appointments_upcoming ?? []).slice(0, 5)
  const recentPayments = (s.recent_payments ?? []).slice(0, 5)
  const topTreatments = (s.top_treatments ?? []).slice(0, 5)

  const margin = s.margin ?? 0
  const marginChange = s.margin && s.margin_last_month
    ? (s.margin - s.margin_last_month)
    : 0

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Inicio</h1>
        <span className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* ── Atajos rápidos ── */}
      {canEditGeneral && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setModal('patient')}>
            <Plus className="h-4 w-4 mr-1" /> Paciente
          </Button>
          <Button variant="outline" onClick={() => setModal('appointment')}>
            <Plus className="h-4 w-4 mr-1" /> Cita
          </Button>
          <Button variant="outline" onClick={() => navigate('/pagos')}>
            <Plus className="h-4 w-4 mr-1" /> Pago
          </Button>
          <Button variant="outline" onClick={() => setModal('expense')}>
            <Plus className="h-4 w-4 mr-1" /> Gasto
          </Button>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Pacientes Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '...' : (s.patients_today ?? 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Citas Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '...' : (s.appointments_today?.length ?? 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Ingresos Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '...' : `S/ ${Number(s.income_today ?? 0).toFixed(2)}`}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Gastos Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loading ? '...' : `S/ ${Number(s.expenses_month ?? 0).toFixed(2)}`}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Rentabilidad + Balance ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Balance del Mes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold">{loading ? '...' : `S/ ${Number(s.balance ?? 0).toFixed(2)}`}</p>
            {!loading && (
              <p className={`text-sm flex items-center gap-1 ${(s.balance_change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(s.balance_change ?? 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(s.balance_change ?? 0)}% vs mes anterior
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Rentabilidad Estimada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Ingresos</p>
                <p className="font-semibold">{loading ? '...' : `S/ ${Number(s.income_month ?? 0).toFixed(2)}`}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gastos</p>
                <p className="font-semibold">{loading ? '...' : `S/ ${Number(s.expenses_month ?? 0).toFixed(2)}`}</p>
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Margen</span>
                <span className={`text-lg font-bold ${margin >= 50 ? 'text-green-600' : margin >= 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {margin}%
                </span>
              </div>
              {!loading && marginChange !== 0 && (
                <p className={`text-xs ${marginChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {marginChange > 0 ? '↑' : '↓'} {Math.abs(marginChange).toFixed(1)}% vs mes anterior
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Alertas ── */}
      {(s.pending_confirmations > 0 || (s.low_stock ?? []).length > 0) && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.pending_confirmations > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>{s.pending_confirmations} cita(s) pendiente(s) de confirmación</span>
                <Button variant="ghost" size="sm" onClick={() => navigate('/citas')}>
                  Ver <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
            {(s.low_stock ?? []).map((item: any) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Package className="h-3 w-3" />
                  {item.name}: {item.quantity} {item.unit} (mín: {item.min_stock})
                </span>
                <Button variant="ghost" size="sm" onClick={() => navigate('/inventario')}>
                  Ver <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Citas de hoy ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">📅 Citas de Hoy</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/citas')}>Ver todas</Button>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay citas hoy</p>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.patient}</p>
                      <p className="text-xs text-muted-foreground">{a.doctor} · {a.start_date?.split(' ')[1] ?? '-'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColor[a.status] ?? 'bg-gray-100'}`}>
                        {statusLabel[a.status] ?? a.status}
                      </span>
                      {a.status === 'pendiente' && (
                        <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => updateAppointment.mutate({ id: a.id, data: { status: 'confirmada' } })} title="Confirmar">
                          ✓
                        </Button>
                      )}
                      {(a.status === 'pendiente' || a.status === 'confirmada') && (
                        <>
                          <Button variant="ghost" size="icon-sm" className="h-6 w-6" onClick={() => updateAppointment.mutate({ id: a.id, data: { status: 'completada' } })} title="Completar">
                            🔄
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="h-6 w-6 text-destructive" onClick={() => updateAppointment.mutate({ id: a.id, data: { status: 'cancelada' } })} title="Cancelar">
                            ✗
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Próximas citas ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">📅 Próximas Citas (48h)</CardTitle>
            <span className="text-xs text-muted-foreground">{s.appointments_upcoming?.length ?? 0} total</span>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay citas próximas</p>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.patient}</p>
                      <p className="text-xs text-muted-foreground">{a.doctor} · {a.start_date}</p>
                    </div>
                    <Badge variant="outline">{statusLabel[a.status] ?? a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Últimos pagos + Top tratamientos ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">💰 Últimos Pagos</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pagos')}>Ver todos</Button>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay pagos recientes</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.patient}</p>
                      <p className="text-xs text-muted-foreground">{p.method} · {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</p>
                    </div>
                    <span className="text-sm font-mono font-medium text-green-600">S/ {Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🏥 Tratamientos más solicitados</CardTitle>
          </CardHeader>
          <CardContent>
            {topTreatments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin datos</p>
            ) : (
              <div className="space-y-2">
                {topTreatments.map((t: any, i: number) => (
                  <div key={t.name ?? i} className="flex items-center justify-between py-2">
                    <span className="text-sm">
                      <span className="font-medium text-muted-foreground mr-2">#{i + 1}</span>
                      {t.name}
                    </span>
                    <span className="text-sm text-muted-foreground">{t.count} veces</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modal: Crear Paciente ── */}
      <Dialog open={modal === 'patient'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo Paciente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Nombre</Label><Input value={patientForm.first_name} onChange={e => setPatientForm(f => ({ ...f, first_name: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Apellido</Label><Input value={patientForm.first_last_name} onChange={e => setPatientForm(f => ({ ...f, first_last_name: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>DNI</Label><Input value={patientForm.dni} onChange={e => setPatientForm(f => ({ ...f, dni: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Teléfono</Label><Input value={patientForm.phone} onChange={e => setPatientForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button disabled={createPatient.isPending} onClick={handlePatientSave}>
              {createPatient.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Crear Cita ── */}
      <Dialog open={modal === 'appointment'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Cita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Paciente</Label>
              <Select value={appointmentForm.patient_id} onValueChange={v => setAppointmentForm(f => ({ ...f, patient_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger>
                <SelectContent>
                  {(patientsList?.data ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.first_name} {p.first_last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Doctor</Label>
              <Select value={appointmentForm.doctor_id} onValueChange={v => setAppointmentForm(f => ({ ...f, doctor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar doctor" /></SelectTrigger>
                <SelectContent>
                  {(doctorsList?.data ?? []).map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>Dr. {d.first_name} {d.first_last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={appointmentForm.date} onChange={e => setAppointmentForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Hora</Label><Input type="time" value={appointmentForm.time} onChange={e => setAppointmentForm(f => ({ ...f, time: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button disabled={createAppointment.isPending} onClick={handleAppointmentSave}>
              {createAppointment.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Registrar Gasto ── */}
      <Dialog open={modal === 'expense'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Gasto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={expenseForm.category} onValueChange={v => setExpenseForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="insumos">Insumos</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="salarios">Salarios</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Monto</Label><Input type="number" min={0} step={0.01} value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Descripción</Label><Input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button disabled={createExpense.isPending} onClick={handleExpenseSave}>
              {createExpense.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
