export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/50 p-6">
      <p className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{value}</p>
      <p className="mt-1 text-sm text-fg-muted">{label}</p>
    </div>
  )
}
