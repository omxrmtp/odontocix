import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogsApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, ClipboardList } from 'lucide-react'
import MobileCardList from '@/components/app/MobileCardList'
import EmptyState from '@/components/app/EmptyState'
import SkeletonTable from '@/components/app/SkeletonTable'
import { usePermission } from '@/hooks/usePermission'

const actionLabels: Record<string, string> = {
  created: 'Creado',
  updated: 'Actualizado',
  deleted: 'Eliminado',
  viewed: 'Visto',
}

const actionColors: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  updated: 'bg-blue-100 text-blue-700',
  deleted: 'bg-red-100 text-red-700',
  viewed: 'bg-gray-100 text-gray-700',
}

const resourceLabels: Record<string, string> = {
  Patient: 'Paciente',
  Doctor: 'Doctor',
  Appointment: 'Cita',
  Budget: 'Presupuesto',
  Payment: 'Pago',
  CashTransaction: 'Caja',
  Treatment: 'Tratamiento',
  ClinicalRecord: 'Ficha Clínica',
  PatientTreatment: 'Tratamiento Paciente',
}

const resourceOptions = Object.entries(resourceLabels).map(([value, label]) => ({ value, label }))

function ChangesDiff({ oldValues, newValues }: { oldValues?: Record<string, unknown> | null; newValues?: Record<string, unknown> | null }) {
  if (!oldValues && !newValues) return <span className="text-muted-foreground text-xs">Sin cambios</span>

  const oldKeys = oldValues ? Object.keys(oldValues) : []
  const newKeys = newValues ? Object.keys(newValues) : []
  const allKeys = Array.from(new Set([...oldKeys, ...newKeys]))

  return (
    <div className="space-y-1 text-xs">
      {allKeys.map((key) => (
        <div key={key} className="grid grid-cols-2 gap-2">
          <div className="bg-red-50 text-red-700 px-2 py-1 rounded truncate" title={String(oldValues?.[key] ?? '')}>
            {String(oldValues?.[key] ?? '-')}
          </div>
          <div className="bg-green-50 text-green-700 px-2 py-1 rounded truncate" title={String(newValues?.[key] ?? '')}>
            {String(newValues?.[key] ?? '-')}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AuditLogsPage() {
  const { canRead } = usePermission()
  const [filters, setFilters] = useState({
    resource_type: '',
    action: '',
    date_from: '',
    date_to: '',
  })
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  const { data, isPending } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditLogsApi.list(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
    ),
  })

  const toggleRow = (id: number) => {
    const next = new Set(expandedRows)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setExpandedRows(next)
  }

  const logs = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold flex-shrink-0">Log de Auditoría</h1>
        <Button
          variant="outline"
          onClick={() => setFilters({ resource_type: '', action: '', date_from: '', date_to: '' })}
        >
          Limpiar filtros
        </Button>
      </div>

      {!canRead('auditoria') && (
        <EmptyState
          title="Sin permisos"
          description="No tienes permisos para ver auditoría"
        />
      )}

      {canRead('auditoria') && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Tipo de recurso</label>
                  <Select
                    value={filters.resource_type}
                    onValueChange={(v) => setFilters(f => ({ ...f, resource_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">Todos</SelectItem>
                      {resourceOptions.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Acción</label>
                  <Select
                    value={filters.action}
                    onValueChange={(v) => setFilters(f => ({ ...f, action: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">Todas</SelectItem>
                      {Object.entries(actionLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Desde</label>
                  <Input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Hasta</label>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registros de auditoría</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {isPending ? (
                <SkeletonTable columns={6} rows={5} />
              ) : logs.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList className="w-12 h-12 text-muted-foreground/50 mb-4" />}
                  title="No hay registros de auditoría"
                  description="Ajuste los filtros o espere a que se generen eventos auditables."
                />
              ) : (
                <>
                  <div className="rounded-md border hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Acción</TableHead>
                          <TableHead>Recurso</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead className="w-24">Cambios</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log: any) => (
                          <>
                            <TableRow
                              key={log.id}
                              className="hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => toggleRow(log.id)}
                            >
                              <TableCell className="whitespace-nowrap text-sm">
                                {log.created_at ? new Date(log.created_at).toLocaleString('es-PE') : '-'}
                              </TableCell>
                              <TableCell className="text-sm">{log.user_name ?? 'Sistema'}</TableCell>
                              <TableCell>
                                <Badge className={actionColors[log.action] ?? ''}>
                                  {actionLabels[log.action] ?? log.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {resourceLabels[log.resource_type] ?? log.resource_type}
                              </TableCell>
                              <TableCell className="text-sm font-mono">{log.resource_id}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); toggleRow(log.id) }}>
                                  {expandedRows.has(log.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {expandedRows.has(log.id) && (
                              <TableRow className="bg-muted/30">
                                <TableCell colSpan={6} className="py-3">
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Cambios detectados</p>
                                    <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground mb-1">
                                      <span>Valor anterior</span>
                                      <span>Valor nuevo</span>
                                    </div>
                                    <ChangesDiff oldValues={log.old_values} newValues={log.new_values} />
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <MobileCardList
                    items={logs}
                    keyFn={(log: any) => log.id}
                    renderCard={(log: any) => (
                      <>
                        <div className="flex items-center justify-between">
                          <Badge className={actionColors[log.action] ?? ''}>
                            {actionLabels[log.action] ?? log.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {log.created_at ? new Date(log.created_at).toLocaleString('es-PE') : '-'}
                          </span>
                        </div>
                        <div className="text-sm font-medium">
                          {resourceLabels[log.resource_type] ?? log.resource_type} #{log.resource_id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Por: {log.user_name ?? 'Sistema'}
                        </div>
                        <div className="pt-1">
                          <ChangesDiff oldValues={log.old_values} newValues={log.new_values} />
                        </div>
                      </>
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
