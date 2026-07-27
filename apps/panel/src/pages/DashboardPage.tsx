import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi, patientsApi, appointmentsApi, cashApi, doctorsApi, budgetsApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { usePermission } from '@/hooks/usePermission'
import {
  Users, CalendarDays, DollarSign, TrendingUp, TrendingDown,
  Package, AlertTriangle, Plus, ArrowRight, Wallet
} from 'lucide-react'

const statusColor: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  confirmada: 'bg-sky-100 text-sky-700',
  completada: 'bg-sky-100 text-sky-700',
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
  const [modal, setModal] = useState<'patient' | 'appointment' | 'payment' | 'expense' | null>(null)

  // ── Paciente ──
  const [patientForm, setPatientForm] = useState({
    dni: '', first_name: '', second_name: '', first_last_name: '', second_last_name: '',
    birth_date: '', gender: '', phone: '', email: '', address: '', reference: '', notes: '',
  })
  const [patientMoreFields, setPatientMoreFields] = useState(false)
  const [patientErrors, setPatientErrors] = useState<Record<string, string>>({})
  const [lookupLoading, setLookupLoading] = useState(false)

  const createPatient = useMutation({
    mutationFn: (data: any) => patientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      setModal(null)
      setPatientForm({ dni: '', first_name: '', second_name: '', first_last_name: '', second_last_name: '', birth_date: '', gender: '', phone: '', email: '', address: '', reference: '', notes: '' })
      setPatientMoreFields(false)
      toast.success('Paciente creado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al crear paciente'),
  })

  const handleLookup = async () => {
    if (patientForm.dni.length !== 8) return toast.error('DNI debe tener 8 dígitos')
    setLookupLoading(true)
    try {
      const res = await patientsApi.lookup(patientForm.dni)
      if (res.error) return toast.error(res.error)
      const d = res.data
      const names = (d.first_name ?? '').split(' ')
      setPatientForm(f => ({
        ...f,
        first_name: names[0] || f.first_name,
        second_name: names.slice(1).join(' ') || f.second_name,
        first_last_name: d.first_last_name ?? f.first_last_name,
        second_last_name: d.second_last_name ?? f.second_last_name,
        birth_date: d.birth_date ?? f.birth_date,
        gender: d.gender ?? f.gender,
        phone: d.phone ?? f.phone,
        email: d.email ?? f.email,
        address: d.address ?? f.address,
        reference: d.reference ?? f.reference,
        notes: d.observations ?? d.notes ?? f.notes,
      }))
      toast.success(`Datos obtenidos de ${res.source === 'cache' ? 'caché local' : 'RENIEC'}`)
    } catch {
      toast.error('No se pudo consultar RENIEC')
    } finally {
      setLookupLoading(false)
    }
  }

  const validatePatient = () => {
    const e: Record<string, string> = {}
    if (!patientForm.dni || patientForm.dni.length !== 8) e.dni = 'DNI debe tener 8 dígitos'
    if (!patientForm.first_name.trim()) e.first_name = 'Nombres es requerido'
    if (!patientForm.first_last_name.trim()) e.first_last_name = 'Apellido paterno es requerido'
    if (!patientForm.phone.trim()) e.phone = 'Teléfono es requerido'
    else if (patientForm.phone.replace(/\D/g, '').length < 7) e.phone = 'Teléfono inválido'
    if (patientForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patientForm.email)) e.email = 'Email inválido'
    setPatientErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0])
      return false
    }
    return true
  }

  const handlePatientSave = () => {
    if (!validatePatient()) return
    const { notes, ...rest } = patientForm
    createPatient.mutate({
      ...rest,
      email: rest.email?.trim() || null,
      observations: notes?.trim() || null,
    })
  }

  // ── Cita ──
  const { data: doctorsList } = useQuery({ queryKey: ['doctors-list-short'], queryFn: () => doctorsApi.list({ per_page: '100' }) })
  const { data: patientsList } = useQuery({ queryKey: ['patients-list-short'], queryFn: () => patientsApi.list({ per_page: '100' }) })
  const [appointmentForm, setAppointmentForm] = useState({
    patient_id: '', doctor_id: '', start_date: '', duration: '30', reason: '', status: 'pendiente',
  })
  const [appointmentErrors, setAppointmentErrors] = useState<Record<string, string>>({})

  const createAppointment = useMutation({
    mutationFn: (data: any) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      setModal(null)
      setAppointmentForm({ patient_id: '', doctor_id: '', start_date: '', duration: '30', reason: '', status: 'pendiente' })
      toast.success('Cita creada')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al crear cita'),
  })

  const validateAppointment = () => {
    const e: Record<string, string> = {}
    if (!appointmentForm.patient_id) e.patient_id = 'Paciente es requerido'
    if (!appointmentForm.doctor_id) e.doctor_id = 'Doctor es requerido'
    if (!appointmentForm.start_date) e.start_date = 'Fecha de inicio es requerida'
    setAppointmentErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0])
      return false
    }
    return true
  }

  const handleAppointmentSave = () => {
    if (!validateAppointment()) return
    const start = new Date(appointmentForm.start_date)
    const end = new Date(start.getTime() + Number(appointmentForm.duration) * 60000)
    createAppointment.mutate({
      patient_id: Number(appointmentForm.patient_id),
      doctor_id: Number(appointmentForm.doctor_id),
      start_date: appointmentForm.start_date,
      end_date: end.toISOString().slice(0, 16),
      reason: appointmentForm.reason || null,
      status: appointmentForm.status,
    })
  }

  // ── Pago ──
  const { data: budgetsList } = useQuery({
    queryKey: ['budgets-list-short'],
    queryFn: () => budgetsApi.list({ per_page: '100' }),
    enabled: modal === 'payment',
  })
  const [paymentForm, setPaymentForm] = useState({
    budget_id: '', amount: '', method: 'cash', reference: '', notes: '',
  })
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({})

  const createPayment = useMutation({
    mutationFn: (data: any) => fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(data),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      setModal(null)
      setPaymentForm({ budget_id: '', amount: '', method: 'cash', reference: '', notes: '' })
      toast.success('Pago registrado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al registrar pago'),
  })

  const validatePayment = () => {
    const e: Record<string, string> = {}
    if (!paymentForm.budget_id) e.budget_id = 'Seleccione un presupuesto'
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) e.amount = 'Ingrese un monto válido'
    setPaymentErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0])
      return false
    }
    return true
  }

  const handlePaymentSave = () => {
    if (!validatePayment()) return
    const budget = (budgetsList?.data ?? []).find((b: any) => String(b.id) === paymentForm.budget_id)
    createPayment.mutate({
      patient_id: budget?.patient_id,
      budget_id: Number(paymentForm.budget_id),
      amount: Number(paymentForm.amount),
      payment_date: new Date().toISOString().split('T')[0],
      method: paymentForm.method,
      reference: paymentForm.reference || null,
      notes: paymentForm.notes || null,
    })
  }

  // ── Gasto ──
  const [expenseForm, setExpenseForm] = useState({
    type: 'expense' as 'income' | 'expense', category: '', amount: '', description: '',
  })
  const [expenseErrors, setExpenseErrors] = useState<Record<string, string>>({})

  const expenseCategories: Record<string, string[]> = {
    income: ['pago_paciente', 'ajuste'],
    expense: ['insumos', 'alquiler', 'servicios', 'salarios', 'mantenimiento', 'otros'],
  }

  const createExpense = useMutation({
    mutationFn: (data: any) => cashApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['cash'] })
      setModal(null)
      setExpenseForm({ type: 'expense', category: '', amount: '', description: '' })
      toast.success('Gasto registrado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error al registrar gasto'),
  })

  const validateExpense = () => {
    const e: Record<string, string> = {}
    if (!expenseForm.category) e.category = 'Seleccione una categoría'
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) e.amount = 'Ingrese un monto válido'
    setExpenseErrors(e)
    if (Object.keys(e).length > 0) {
      toast.error(Object.values(e)[0])
      return false
    }
    return true
  }

  const handleExpenseSave = () => {
    if (!validateExpense()) return
    createExpense.mutate({
      type: expenseForm.type,
      category: expenseForm.category,
      amount: Number(expenseForm.amount),
      description: expenseForm.description || null,
    })
  }

  // ── Acciones de citas ──
  const updateAppointment = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => appointmentsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Estado actualizado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Error'),
  })

  // ── Helpers ──
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
          <Button variant="outline" onClick={() => setModal('payment')}>
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
              <p className={`text-sm flex items-center gap-1 ${(s.balance_change ?? 0) >= 0 ? 'text-sky-600' : 'text-red-600'}`}>
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
                <span className={`text-lg font-bold ${margin >= 50 ? 'text-sky-600' : margin >= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                  {margin}%
                </span>
              </div>
              {!loading && marginChange !== 0 && (
                <p className={`text-xs ${marginChange > 0 ? 'text-sky-600' : 'text-red-600'}`}>
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
                    <span className="text-sm font-mono font-medium text-sky-600">S/ {Number(p.amount).toFixed(2)}</span>
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

      {/* ════════════════════════════════════════
          MODAL: NUEVO PACIENTE
          ════════════════════════════════════════ */}
      <Dialog open={modal === 'patient'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Paciente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* DNI + RENIEC */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label>DNI</Label>
                <Input
                  value={patientForm.dni}
                  onChange={e => setPatientForm(f => ({ ...f, dni: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  maxLength={8}
                  placeholder="12345678"
                  className={patientErrors.dni ? 'border-red-500' : ''}
                />
              </div>
              <Button type="button" variant="outline" onClick={handleLookup} disabled={lookupLoading}>
                {lookupLoading ? '...' : 'RENIEC'}
              </Button>
            </div>

            {/* Nombres obligatorios */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Nombres *</Label>
                <Input
                  value={patientForm.first_name}
                  onChange={e => setPatientForm(f => ({ ...f, first_name: e.target.value }))}
                  className={patientErrors.first_name ? 'border-red-500' : ''}
                />
              </div>
              <div className="space-y-1">
                <Label>Apellido paterno *</Label>
                <Input
                  value={patientForm.first_last_name}
                  onChange={e => setPatientForm(f => ({ ...f, first_last_name: e.target.value }))}
                  className={patientErrors.first_last_name ? 'border-red-500' : ''}
                />
              </div>
            </div>

            {/* Teléfono obligatorio */}
            <div className="space-y-1">
              <Label>Teléfono *</Label>
              <Input
                value={patientForm.phone}
                onChange={e => setPatientForm(f => ({ ...f, phone: e.target.value }))}
                className={patientErrors.phone ? 'border-red-500' : ''}
              />
            </div>

            {/* Botón Más campos */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setPatientMoreFields(v => !v)}
            >
              {patientMoreFields ? '▲ Menos campos' : '▼ Más campos'}
            </Button>

            {/* Campos adicionales */}
            {patientMoreFields && (
              <div className="space-y-3 pt-2 border-t">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Segundo nombre</Label><Input value={patientForm.second_name} onChange={e => setPatientForm(f => ({ ...f, second_name: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Apellido materno</Label><Input value={patientForm.second_last_name} onChange={e => setPatientForm(f => ({ ...f, second_last_name: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Fecha nacimiento</Label><Input type="date" value={patientForm.birth_date} onChange={e => setPatientForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
                  <div className="space-y-1">
                    <Label>Género</Label>
                    <select
                      value={patientForm.gender}
                      onChange={e => setPatientForm(f => ({ ...f, gender: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={patientForm.email} onChange={e => setPatientForm(f => ({ ...f, email: e.target.value }))} className={patientErrors.email ? 'border-red-500' : ''} /></div>
                <div className="space-y-1"><Label>Dirección</Label><Input value={patientForm.address} onChange={e => setPatientForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Referencia</Label><Input value={patientForm.reference} onChange={e => setPatientForm(f => ({ ...f, reference: e.target.value }))} /></div>
                <div className="space-y-1"><Label>Notas / Observaciones</Label><textarea value={patientForm.notes} onChange={e => setPatientForm(f => ({ ...f, notes: e.target.value }))} className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button disabled={createPatient.isPending} onClick={handlePatientSave}>
              {createPatient.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════
          MODAL: NUEVA CITA
          ════════════════════════════════════════ */}
      <Dialog open={modal === 'appointment'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Cita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Paciente *</Label>
              <Select value={appointmentForm.patient_id} onValueChange={v => setAppointmentForm(f => ({ ...f, patient_id: v }))}>
                <SelectTrigger className={appointmentErrors.patient_id ? 'border-red-500' : ''}><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger>
                <SelectContent>
                  {(patientsList?.data ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.first_name} {p.first_last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Doctor *</Label>
              <Select value={appointmentForm.doctor_id} onValueChange={v => setAppointmentForm(f => ({ ...f, doctor_id: v }))}>
                <SelectTrigger className={appointmentErrors.doctor_id ? 'border-red-500' : ''}><SelectValue placeholder="Seleccionar doctor" /></SelectTrigger>
                <SelectContent>
                  {(doctorsList?.data ?? []).map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>Dr. {d.first_name} {d.first_last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha y hora *</Label>
              <Input
                type="datetime-local"
                value={appointmentForm.start_date}
                onChange={e => setAppointmentForm(f => ({ ...f, start_date: e.target.value }))}
                className={appointmentErrors.start_date ? 'border-red-500' : ''}
              />
            </div>
            <div className="space-y-1">
              <Label>Duración</Label>
              <Select value={appointmentForm.duration} onValueChange={v => setAppointmentForm(f => ({ ...f, duration: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Input value={appointmentForm.reason} onChange={e => setAppointmentForm(f => ({ ...f, reason: e.target.value }))} placeholder="Opcional" />
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={appointmentForm.status} onValueChange={v => setAppointmentForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="completada">Completada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
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

      {/* ════════════════════════════════════════
          MODAL: REGISTRAR PAGO
          ════════════════════════════════════════ */}
      <Dialog open={modal === 'payment'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Presupuesto *</Label>
              <Select value={paymentForm.budget_id} onValueChange={v => setPaymentForm(f => ({ ...f, budget_id: v }))}>
                <SelectTrigger className={paymentErrors.budget_id ? 'border-red-500' : ''}><SelectValue placeholder="Seleccionar presupuesto" /></SelectTrigger>
                <SelectContent>
                  {(budgetsList?.data ?? []).map((b: any) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      #{b.id} - {b.patient?.first_name} {b.patient?.first_last_name} - S/ {Number(b.grand_total).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Monto *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={paymentForm.amount}
                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                className={paymentErrors.amount ? 'border-red-500' : ''}
              />
            </div>
            <div className="space-y-1">
              <Label>Método de pago</Label>
              <Select value={paymentForm.method} onValueChange={v => setPaymentForm(f => ({ ...f, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Referencia</Label><Input value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} placeholder="Opcional" /></div>
            <div className="space-y-1"><Label>Notas</Label><Input value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button disabled={createPayment.isPending} onClick={handlePaymentSave}>
              {createPayment.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════
          MODAL: REGISTRAR GASTO
          ════════════════════════════════════════ */}
      <Dialog open={modal === 'expense'} onOpenChange={() => setModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Movimiento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={expenseForm.type} onValueChange={(v: any) => setExpenseForm(f => ({ ...f, type: v, category: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Egreso (Gasto)</SelectItem>
                  <SelectItem value="income">Ingreso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Categoría *</Label>
              <Select value={expenseForm.category} onValueChange={v => setExpenseForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className={expenseErrors.category ? 'border-red-500' : ''}><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories[expenseForm.type].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Monto *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={expenseForm.amount}
                onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                className={expenseErrors.amount ? 'border-red-500' : ''}
              />
            </div>
            <div className="space-y-1"><Label>Descripción</Label><Input value={expenseForm.description} onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcional" /></div>
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
