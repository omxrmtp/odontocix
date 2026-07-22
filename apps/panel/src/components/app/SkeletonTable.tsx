interface SkeletonProps {
  columns: number
  rows?: number
}

export default function SkeletonTable({ columns, rows = 5 }: SkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-5 bg-muted animate-pulse rounded flex-1" style={{ opacity: 1 - j * 0.1 }} />
          ))}
        </div>
      ))}
    </div>
  )
}
