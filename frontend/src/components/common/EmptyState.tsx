import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="tetrel-empty-state">
      <Icon className="tetrel-empty-state-icon" />
      <h3 className="tetrel-empty-state-title">{title}</h3>
      <p className="tetrel-empty-state-desc">{description}</p>
      {action}
    </div>
  )
}
