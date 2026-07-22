import { Navigate } from 'react-router-dom'
import { usePermission } from '@/hooks/usePermission'
import { toast } from 'sonner'

interface ProtectedRouteProps {
  children: React.ReactNode
  permission: string
}

export default function ProtectedRoute({ children, permission }: ProtectedRouteProps) {
  const { can } = usePermission()

  if (!can(permission)) {
    toast.error('No tienes permisos para acceder a esta sección')
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
