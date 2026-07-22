import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/test/test-utils'
import SkeletonTable from './SkeletonTable'

describe('SkeletonTable', () => {
  it('renders default 5 rows with given columns', () => {
    const { container } = renderWithProviders(<SkeletonTable columns={3} />)
    const rows = container.querySelectorAll('.space-y-2 > div')
    expect(rows.length).toBe(5)
  })

  it('renders specified number of rows', () => {
    const { container } = renderWithProviders(<SkeletonTable columns={2} rows={3} />)
    const rows = container.querySelectorAll('.space-y-2 > div')
    expect(rows.length).toBe(3)
  })

  it('renders correct number of columns per row', () => {
    const { container } = renderWithProviders(<SkeletonTable columns={4} />)
    const firstRow = container.querySelector('.space-y-2 > div')
    expect(firstRow?.children.length).toBe(4)
  })
})
