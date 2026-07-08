export function PageContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  );
}

export function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`py-12 sm:py-16 lg:py-20 ${className}`}>
      {children}
    </section>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-text-light">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SplitLayout({ sidebar, main, sidebarPosition = 'right' }: { sidebar: React.ReactNode; main: React.ReactNode; sidebarPosition?: 'left' | 'right' }) {
  return (
    <div className={`grid gap-8 lg:grid-cols-[1fr_360px] ${sidebarPosition === 'left' ? 'lg:grid-cols-[360px_1fr]' : ''}`}>
      {sidebarPosition === 'left' && <aside className="order-first">{sidebar}</aside>}
      <main className="min-w-0">{main}</main>
      {sidebarPosition === 'right' && <aside>{sidebar}</aside>}
    </div>
  );
}

export function AutoGrid({ children, minWidth = 280, className = '' }: { children: React.ReactNode; minWidth?: number; className?: string }) {
  return (
    <div className={`grid gap-6 ${className}`} style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))` }}>
      {children}
    </div>
  );
}
