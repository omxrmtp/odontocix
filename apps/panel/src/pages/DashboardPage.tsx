import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/endpoints'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

function SkeletonCard() {
  return <Card><CardContent className="pt-6"><div className="h-8 bg-muted animate-pulse rounded" /><div className="h-4 bg-muted animate-pulse rounded mt-2 w-1/2" /></CardContent></Card>
}

const statusColor: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendiente: 'secondary',
  confirmada: 'default',
  completada: 'outline',
  cancelada: 'destructive',
}

export default function DashboardPage() {
  const { data: stats, isPending: loadingStats } = useQuery({ queryKey: ['dashboard-stats'], queryFn: () => dashboardApi.stats() })
  const { data: charts, isPending: loadingCharts } = useQuery({ queryKey: ['dashboard-charts'], queryFn: () => dashboardApi.charts() })

  if (loadingStats && loadingCharts) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      </div>
    )
  }

  const s = stats ?? {}
  const c = charts ?? {}

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pacientes Hoy</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{s.patients_today ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Citas Hoy</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{s.appointments_today ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ingresos Hoy</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">S/ {(s.income_today ?? 0).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Citas Pendientes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{s.pending_appointments ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Citas por Día (últimos 30 días)</CardTitle></CardHeader>
          <CardContent>
            {loadingCharts ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={c.appointments_per_day ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ingresos vs Egresos (últimos 12 meses)</CardTitle></CardHeader>
          <CardContent>
            {loadingCharts ? (
              <div className="h-64 bg-muted animate-pulse rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={c.income_vs_expenses ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="income" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Ingresos" />
                  <Bar dataKey="expenses" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} name="Egresos" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Últimas Citas</CardTitle></CardHeader>
          <CardContent>
            {(c.latest_appointments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay citas recientes</p>
            ) : (
              <div className="space-y-3">
                {(c.latest_appointments ?? []).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{a.patient}</p>
                      <p className="text-xs text-muted-foreground">{a.doctor} &middot; {a.date}</p>
                    </div>
                    <Badge variant={statusColor[a.status] ?? 'secondary'}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Últimos Pagos</CardTitle></CardHeader>
          <CardContent>
            {(c.latest_payments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay pagos recientes</p>
            ) : (
              <div className="space-y-3">
                {(c.latest_payments ?? []).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.patient}</p>
                      <p className="text-xs text-muted-foreground">{p.method} &middot; {p.date}</p>
                    </div>
                    <span className="text-sm font-mono font-medium">S/ {Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Tratamientos más usados</CardTitle></CardHeader>
        <CardContent>
          {(c.top_treatments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {(c.top_treatments ?? []).map((t: any, i: number) => (
                <div key={t.name ?? i} className="flex items-center justify-between py-1">
                  <span className="text-sm"><span className="font-medium text-muted-foreground mr-2">#{i + 1}</span>{t.name}</span>
                  <span className="text-sm text-muted-foreground">{t.count} veces</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
