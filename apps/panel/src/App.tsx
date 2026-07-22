import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { AuthProvider } from '@/contexts/AuthContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import AppLayout from '@/components/app/AppLayout'
import ProtectedRoute from '@/components/app/ProtectedRoute'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const PatientPortalPage = lazy(() => import('@/pages/PatientPortalPage'))
const OnlineBookingPage = lazy(() => import('@/pages/OnlineBookingPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const AppointmentsPage = lazy(() => import('@/pages/AppointmentsPage'))
const PatientsPage = lazy(() => import('@/pages/PatientsPage'))
const PatientFormPage = lazy(() => import('@/pages/PatientFormPage'))
const PatientHistoryPage = lazy(() => import('@/pages/PatientHistoryPage'))
const DoctorsPage = lazy(() => import('@/pages/DoctorsPage'))
const BudgetsPage = lazy(() => import('@/pages/BudgetsPage'))
const PaymentsPage = lazy(() => import('@/pages/PaymentsPage'))
const CashPage = lazy(() => import('@/pages/CashPage'))
const InventoryPage = lazy(() => import('@/pages/InventoryPage'))
const TreatmentsPage = lazy(() => import('@/pages/TreatmentsPage'))
const ConsentFormsPage = lazy(() => import('@/pages/ConsentFormsPage'))
const AvailableSlotsPage = lazy(() => import('@/pages/AvailableSlotsPage'))
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
})

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal/:token" element={<PatientPortalPage />} />
      <Route path="/reservar" element={<OnlineBookingPage />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="citas" element={<ProtectedRoute permission="citas.ver"><AppointmentsPage /></ProtectedRoute>} />
        <Route path="pacientes" element={<ProtectedRoute permission="pacientes.ver"><PatientsPage /></ProtectedRoute>} />
        <Route path="pacientes/nuevo" element={<ProtectedRoute permission="pacientes.editar"><PatientFormPage /></ProtectedRoute>} />
        <Route path="pacientes/:id/editar" element={<ProtectedRoute permission="pacientes.editar"><PatientFormPage /></ProtectedRoute>} />
        <Route path="pacientes/:id/historial" element={<ProtectedRoute permission="pacientes.ver"><PatientHistoryPage /></ProtectedRoute>} />
        <Route path="doctores" element={<ProtectedRoute permission="doctores.ver"><DoctorsPage /></ProtectedRoute>} />
        <Route path="presupuestos" element={<ProtectedRoute permission="presupuestos.ver"><BudgetsPage /></ProtectedRoute>} />
        <Route path="pagos" element={<ProtectedRoute permission="pagos.ver"><PaymentsPage /></ProtectedRoute>} />
        <Route path="caja" element={<ProtectedRoute permission="caja.ver"><CashPage /></ProtectedRoute>} />
        <Route path="inventario" element={<ProtectedRoute permission="inventario.ver"><InventoryPage /></ProtectedRoute>} />
        <Route path="tratamientos" element={<ProtectedRoute permission="tratamientos.ver"><TreatmentsPage /></ProtectedRoute>} />
        <Route path="consentimientos" element={<ProtectedRoute permission="consentimientos.ver"><ConsentFormsPage /></ProtectedRoute>} />
        <Route path="disponibilidad" element={<ProtectedRoute permission="disponibilidad.ver"><AvailableSlotsPage /></ProtectedRoute>} />
        <Route path="reportes" element={<ProtectedRoute permission="reportes.ver"><ReportsPage /></ProtectedRoute>} />
        <Route path="auditoria" element={<ProtectedRoute permission="auditoria.ver"><AuditLogsPage /></ProtectedRoute>} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="configuracion" element={<ProtectedRoute permission="configuracion.ver"><SettingsPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <BrowserRouter>
          <AuthProvider>
          <TooltipProvider>
            <Suspense
              fallback={
                <div className="flex h-screen items-center justify-center">
                  Cargando...
                </div>
              }
            >
              <AppRoutes />
            </Suspense>
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
