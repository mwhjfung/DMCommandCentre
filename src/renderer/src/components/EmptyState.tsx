import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'

interface EmptyStateProps {
  icon?: ComponentType<LucideProps>
  title: string
  description?: string
  children?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      {Icon && <Icon size={32} strokeWidth={1.5} className="text-ink-muted" />}
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mt-1 max-w-md text-sm text-ink-muted">{description}</p>}
      </div>
      {children}
    </div>
  )
}
