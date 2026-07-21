import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function AppLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar placeholder */}
      <aside className="w-64 border-r bg-muted/30 p-4">
        <h1 className="text-xl font-bold text-primary">OdontoCix</h1>
        <nav className="mt-8 space-y-2">
          <a href="/" className="block rounded px-3 py-2 hover:bg-muted">Dashboard</a>
          <a href="/pacientes" className="block rounded px-3 py-2 hover:bg-muted">Pacientes</a>
          <a href="/doctores" className="block rounded px-3 py-2 hover:bg-muted">Doctores</a>
          <a href="/citas" className="block rounded px-3 py-2 hover:bg-muted">Citas</a>
          <a href="/presupuestos" className="block rounded px-3 py-2 hover:bg-muted">Presupuestos</a>
          <a href="/caja" className="block rounded px-3 py-2 hover:bg-muted">Caja</a>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
