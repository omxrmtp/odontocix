import { ReactNode } from 'react'

interface MobileCardListProps<T> {
  items: T[]
  renderCard: (item: T, index: number) => ReactNode
  keyFn: (item: T) => string | number
  emptyMessage?: string
}

export default function MobileCardList<T>({ items, renderCard, keyFn, emptyMessage }: MobileCardListProps<T>) {
  if (items.length === 0) return null
  return (
    <div className="md:hidden space-y-2">
      {items.map((item, i) => (
        <div key={keyFn(item)} className="border rounded-lg p-3 space-y-1.5 bg-card">
          {renderCard(item, i)}
        </div>
      ))}
    </div>
  )
}
