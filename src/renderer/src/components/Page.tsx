import type { ReactNode } from 'react'

interface PageProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  /** When true, the body is not wrapped in a scroll container (the page manages its own). */
  flush?: boolean
  children: ReactNode
}

export function Page({ title, subtitle, actions, flush, children }: PageProps): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3.5">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-sm text-ink-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {flush ? (
        <div className="min-h-0 flex-1">{children}</div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      )}
    </div>
  )
}
