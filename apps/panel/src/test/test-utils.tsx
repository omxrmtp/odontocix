import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { vi } from 'vitest'

// Mock usePermission to return true for all checks in tests
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    can: () => true,
    canView: () => true,
    canRead: () => true,
    canEdit: () => true,
    roles: ['Super Admin'],
    isSuperAdmin: true,
  }),
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

interface Options extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
}

export function renderWithProviders(ui: ReactElement, options: Options = {}) {
  const { initialEntries = ['/'] } = options
  const queryClient = createQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <TooltipProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
            <Toaster />
          </TooltipProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  return { ...render(ui, { wrapper: Wrapper, ...options }), queryClient }
}
