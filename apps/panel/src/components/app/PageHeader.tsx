import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, backTo, actions }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <Button variant="outline" size="sm" onClick={() => navigate(backTo)}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-3xl font-bold truncate">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
