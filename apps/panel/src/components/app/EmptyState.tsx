import { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon ?? <Inbox className="w-12 h-12 text-muted-foreground/50 mb-4" />}
      <p className="text-base font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
