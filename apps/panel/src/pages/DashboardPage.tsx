import { useAuth } from '@/contexts/AuthContext'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Bienvenido, {user?.name}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-lg">Próximas citas</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">0</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Pacientes hoy</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">0</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Ingresos del mes</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">S/ 0.00</p></CardContent>
        </Card>
      </div>
    </div>
  )
}
