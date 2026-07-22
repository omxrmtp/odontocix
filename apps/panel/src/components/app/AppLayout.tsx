import { useState } from 'react'
import { Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useTheme } from 'next-themes'
import {
  Home, Users, Stethoscope, Calendar, CalendarDays, Pill,
  FileSignature, Receipt, CreditCard, Wallet, Package, BarChart3,
  ClipboardList, Settings, UserCircle, LogOut, Menu, X, Sun, Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetClose } from '@/components/ui/sheet'
import ErrorBoundary from './ErrorBoundary'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  )
}

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  perm: string | null
}

const nav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home, perm: null },
  { href: '/pacientes', label: 'Pacientes', icon: Users, perm: 'pacientes.ver' },
  { href: '/doctores', label: 'Doctores', icon: Stethoscope, perm: 'doctores.ver' },
  { href: '/citas', label: 'Citas', icon: Calendar, perm: 'citas.ver' },
  { href: '/disponibilidad', label: 'Disponibilidad', icon: CalendarDays, perm: 'disponibilidad.ver' },
  { href: '/tratamientos', label: 'Tratamientos', icon: Pill, perm: 'tratamientos.ver' },
  { href: '/consentimientos', label: 'Consentimientos', icon: FileSignature, perm: 'consentimientos.ver' },
  { href: '/presupuestos', label: 'Presupuestos', icon: Receipt, perm: 'presupuestos.ver' },
  { href: '/pagos', label: 'Pagos', icon: CreditCard, perm: 'pagos.ver' },
  { href: '/caja', label: 'Caja', icon: Wallet, perm: 'caja.ver' },
  { href: '/inventario', label: 'Inventario', icon: Package, perm: 'inventario.ver' },
  { href: '/reportes', label: 'Reportes', icon: BarChart3, perm: 'reportes.ver' },
  { href: '/auditoria', label: 'Auditoría', icon: ClipboardList, perm: 'auditoria.ver' },
  { href: '/configuracion', label: 'Configuración', icon: Settings, perm: 'configuracion.ver' },
  { href: '/perfil', label: 'Perfil', icon: UserCircle, perm: null },
]

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const location = useLocation()
  return (
    <>
      {items.map(({ href, label, icon: Icon }) => {
        const active = location.pathname === href || (href !== '/' && location.pathname.startsWith(href))
        return (
          <Link
            key={href}
            to={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {Icon && <Icon />}
            {label}
          </Link>
        )
      })}
    </>
  )
}

function DesktopSidebar({ logout, items }: { logout: () => void; items: NavItem[] }) {
  return (
    <aside className="hidden md:flex w-64 border-r bg-muted/30 p-4 flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">OdontoCix</h1>
        <ThemeToggle />
      </div>
      <nav className="mt-8 space-y-1 flex-1">
        <NavLinks items={items} />
      </nav>
      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors mt-auto"
      >
        <LogOut />
        Cerrar sesión
      </button>
    </aside>
  )
}

function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="md:hidden flex items-center justify-between h-14 border-b px-4 bg-background shrink-0">
      <button onClick={onMenuClick} className="p-2 -ml-2 rounded-lg hover:bg-muted/50" aria-label="Abrir menú">
        <Menu className="w-5 h-5" />
      </button>
      <h1 className="text-lg font-bold text-primary">OdontoCix</h1>
      <ThemeToggle />
    </div>
  )
}

export default function AppLayout() {
  const { user, loading, logout } = useAuth()
  const { canView } = usePermission()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleNav = nav.filter(item => !item.perm || canView(item.perm))

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Cargando...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen">
      <DesktopSidebar logout={logout} items={visibleNav} />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-4 flex flex-col">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold text-primary">OdontoCix</h1>
            <SheetClose asChild>
              <Button variant="ghost" size="icon-sm">
                <X className="w-4 h-4" />
              </Button>
            </SheetClose>
          </div>
          <nav className="space-y-1 flex-1">
            <NavLinks items={visibleNav} onNavigate={() => setSidebarOpen(false)} />
          </nav>
          <button
            onClick={() => { logout(); setSidebarOpen(false) }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogOut />
            Cerrar sesión
          </button>
        </SheetContent>
      </Sheet>

      <div className="flex-1 flex flex-col min-w-0">
        <MobileTopBar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
