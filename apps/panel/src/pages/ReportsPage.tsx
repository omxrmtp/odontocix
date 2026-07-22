import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/lib/endpoints'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import EmptyState from '@/components/app/EmptyState'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts'
import { Download, TrendingUp, Stethoscope, Users, UserCheck } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

const COLORS = ['var(--color-primary)', 'var(--color-secondary)', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function toCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = row[h]
        if (val === null || val === undefined) return ''
        const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
        return `"${str.replace(/"/g, '""')}"`
      }).join(',')
    ),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (f: string, t: string) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="from" className="text-xs">Desde</Label>
        <Input id="from" type="date" value={from} onChange={e => onChange(e.target.value, to)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="to" className="text-xs">Hasta</Label>
        <Input id="to" type="date" value={to} onChange={e => onChange(from, e.target.value)} />
      </div>
    </div>
  )
}

function ExportButton({ data, filename }: { data: Record<string, unknown>[]; filename: string }) {
  if (data.length === 0) return null
  return (
    <Button variant="outline" size="sm" onClick={() => toCSV(data, filename)} className="gap-2">
      <Download className="w-4 h-4" />
      Exportar CSV
    </Button>
  )
}

function getDefaultRange() {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const from = firstDay.toISOString().split('T')[0]
  const to = now.toISOString().split('T')[0]
  return { from, to }
}

export default function ReportsPage() {
  const { canEdit, canRead } = usePermission()
  const { from: defaultFrom, to: defaultTo } = getDefaultRange()
  const [incomeRange, setIncomeRange] = useState({ from: defaultFrom, to: defaultTo, groupBy: 'day' })
  const [treatmentRange, setTreatmentRange] = useState({ from: defaultFrom, to: defaultTo })
  const [doctorRange, setDoctorRange] = useState({ from: defaultFrom, to: defaultTo })
  const [patientRange, setPatientRange] = useState({ from: defaultFrom, to: defaultTo })

  const incomeQuery = useQuery({
    queryKey: ['reports-income', incomeRange],
    queryFn: () => reportsApi.income({
      from: incomeRange.from,
      to: incomeRange.to,
      group_by: incomeRange.groupBy,
    }),
    enabled: !!incomeRange.from && !!incomeRange.to,
  })

  const treatmentQuery = useQuery({
    queryKey: ['reports-treatments', treatmentRange],
    queryFn: () => reportsApi.treatments({
      from: treatmentRange.from,
      to: treatmentRange.to,
    }),
    enabled: !!treatmentRange.from && !!treatmentRange.to,
  })

  const doctorQuery = useQuery({
    queryKey: ['reports-doctors', doctorRange],
    queryFn: () => reportsApi.doctors({
      from: doctorRange.from,
      to: doctorRange.to,
    }),
    enabled: !!doctorRange.from && !!doctorRange.to,
  })

  const patientQuery = useQuery({
    queryKey: ['reports-patients', patientRange],
    queryFn: () => reportsApi.patients({
      from: patientRange.from,
      to: patientRange.to,
    }),
    enabled: !!patientRange.from && !!patientRange.to,
  })

  const incomeData = (incomeQuery.data?.data ?? []) as Array<{
    date: string; total_income: number; total_expenses: number; net_balance: number; payment_methods: Array<{ method: string; total: number }>
  }>
  const treatmentData = (treatmentQuery.data?.data ?? []) as Array<{
    treatment_name: string; quantity: number; revenue: number; avg_price: number
  }>
  const doctorData = (doctorQuery.data?.data ?? []) as Array<{
    doctor_name: string; appointments_count: number; treatments_completed: number; revenue_generated: number
  }>
  const patientData = patientQuery.data as { new_patients: number; returning_patients: number; retention_rate: number } | undefined

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-bold">Reportes</h1>
      </div>

      {!canRead('reportes') && (
        <EmptyState
          title="Sin permisos"
          description="No tienes permisos para ver reportes"
        />
      )}

      {canRead('reportes') && (
      <Tabs defaultValue="income" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="income" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Ingresos
          </TabsTrigger>
          <TabsTrigger value="treatments" className="gap-2">
            <Stethoscope className="w-4 h-4" />
            Tratamientos
          </TabsTrigger>
          <TabsTrigger value="doctors" className="gap-2">
            <UserCheck className="w-4 h-4" />
            Doctores
          </TabsTrigger>
          <TabsTrigger value="patients" className="gap-2">
            <Users className="w-4 h-4" />
            Pacientes
          </TabsTrigger>
        </TabsList>

        {/* Income Tab */}
        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Reporte de Ingresos</CardTitle>
                {canEdit('reportes') && <ExportButton data={incomeData as unknown as Record<string, unknown>[]} filename="reporte-ingresos.csv" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <DateRange from={incomeRange.from} to={incomeRange.to} onChange={(f, t) => setIncomeRange(r => ({ ...r, from: f, to: t }))} />
                <div className="space-y-1">
                  <Label htmlFor="group-by" className="text-xs">Agrupar por</Label>
                  <select
                    id="group-by"
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                    value={incomeRange.groupBy}
                    onChange={e => setIncomeRange(r => ({ ...r, groupBy: e.target.value }))}
                  >
                    <option value="day">Día</option>
                    <option value="week">Semana</option>
                    <option value="month">Mes</option>
                  </select>
                </div>
              </div>

              {incomeQuery.isLoading ? (
                <div className="h-64 bg-muted animate-pulse rounded" />
              ) : incomeData.length === 0 ? (
                <EmptyState message="No hay datos de ingresos para el rango seleccionado" />
              ) : (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={incomeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `S/ ${value.toFixed(2)}`} />
                        <Bar dataKey="total_income" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Ingresos" />
                        <Bar dataKey="total_expenses" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} name="Egresos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Periodo</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Egresos</TableHead>
                          <TableHead className="text-right">Balance Neto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeData.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell className="font-medium">{row.date}</TableCell>
                            <TableCell className="text-right">S/ {row.total_income.toFixed(2)}</TableCell>
                            <TableCell className="text-right">S/ {row.total_expenses.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">S/ {row.net_balance.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatments Tab */}
        <TabsContent value="treatments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Reporte de Tratamientos</CardTitle>
                {canEdit('reportes') && <ExportButton data={treatmentData as unknown as Record<string, unknown>[]} filename="reporte-tratamientos.csv" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DateRange from={treatmentRange.from} to={treatmentRange.to} onChange={(f, t) => setTreatmentRange({ from: f, to: t })} />

              {treatmentQuery.isLoading ? (
                <div className="h-64 bg-muted animate-pulse rounded" />
              ) : treatmentData.length === 0 ? (
                <EmptyState message="No hay datos de tratamientos para el rango seleccionado" />
              ) : (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={treatmentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="treatment_name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                        <YAxis />
                        <Tooltip formatter={(value: number, name: string) => name === 'revenue' ? `S/ ${value.toFixed(2)}` : value} />
                        <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Ingresos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tratamiento</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Ingresos</TableHead>
                          <TableHead className="text-right">Precio Promedio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {treatmentData.map((row) => (
                          <TableRow key={row.treatment_name}>
                            <TableCell className="font-medium">{row.treatment_name}</TableCell>
                            <TableCell className="text-right">{row.quantity}</TableCell>
                            <TableCell className="text-right">S/ {row.revenue.toFixed(2)}</TableCell>
                            <TableCell className="text-right">S/ {row.avg_price.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Doctors Tab */}
        <TabsContent value="doctors" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Productividad de Doctores</CardTitle>
                {canEdit('reportes') && <ExportButton data={doctorData as unknown as Record<string, unknown>[]} filename="reporte-doctores.csv" />}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DateRange from={doctorRange.from} to={doctorRange.to} onChange={(f, t) => setDoctorRange({ from: f, to: t })} />

              {doctorQuery.isLoading ? (
                <div className="h-64 bg-muted animate-pulse rounded" />
              ) : doctorData.length === 0 ? (
                <EmptyState message="No hay datos de doctores para el rango seleccionado" />
              ) : (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={doctorData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="doctor_name" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip formatter={(value: number, name: string) => name === 'revenue_generated' ? `S/ ${value.toFixed(2)}` : value} />
                        <Bar dataKey="appointments_count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Citas" />
                        <Bar dataKey="treatments_completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Tratamientos" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Doctor</TableHead>
                          <TableHead className="text-right">Citas</TableHead>
                          <TableHead className="text-right">Tratamientos</TableHead>
                          <TableHead className="text-right">Ingresos Generados</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {doctorData.map((row) => (
                          <TableRow key={row.doctor_name}>
                            <TableCell className="font-medium">{row.doctor_name}</TableCell>
                            <TableCell className="text-right">{row.appointments_count}</TableCell>
                            <TableCell className="text-right">{row.treatments_completed}</TableCell>
                            <TableCell className="text-right font-semibold">S/ {row.revenue_generated.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patients Tab */}
        <TabsContent value="patients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Retención de Pacientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <DateRange from={patientRange.from} to={patientRange.to} onChange={(f, t) => setPatientRange({ from: f, to: t })} />

              {patientQuery.isLoading ? (
                <div className="h-64 bg-muted animate-pulse rounded" />
              ) : !patientData ? (
                <EmptyState message="No hay datos de pacientes para el rango seleccionado" />
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Nuevos Pacientes</CardTitle></CardHeader>
                      <CardContent><p className="text-3xl font-bold">{patientData.new_patients}</p></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pacientes Recurrentes</CardTitle></CardHeader>
                      <CardContent><p className="text-3xl font-bold">{patientData.returning_patients}</p></CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tasa de Retención</CardTitle></CardHeader>
                      <CardContent><p className="text-3xl font-bold">{patientData.retention_rate}%</p></CardContent>
                    </Card>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Nuevos', value: patientData.new_patients },
                            { name: 'Recurrentes', value: patientData.returning_patients },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="var(--color-primary)" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  )
}
