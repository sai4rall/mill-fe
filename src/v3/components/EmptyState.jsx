export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-14 text-center">
      {Icon && <div className="mb-1 flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground"><Icon className="size-6" /></div>}
      <p className="font-medium">{title}</p>
      {children && <p className="max-w-md text-sm text-muted-foreground">{children}</p>}
      {action}
    </div>
  )
}
