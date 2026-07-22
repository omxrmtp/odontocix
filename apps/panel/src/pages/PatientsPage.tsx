import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { patientsApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import MobileCardList from '@/components/app/MobileCardList'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import SkeletonTable from '@/components/app/SkeletonTable'
import { PortalUrlDialog } from '@/components/app/PortalUrlDialog'
import { QrCode } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

export default function PatientsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [qrPatient, setQrPatient] = useState<{ token: string; name: string } | null>(null)
  const { canEdit } = usePermission()

  const { data, isPending } = useQuery({
    queryKey: ['patients', page, search],
    queryFn: () => patientsApi.list({ page: String(page), per_page: '15', search }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => patientsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['patients'] }); toast.success('Paciente eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al eliminar'),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Pacientes</h1>
        {canEdit('pacientes') && <Link to="/pacientes/nuevo"><Button>Nuevo paciente</Button></Link>}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Buscar por nombre, apellido o DNI..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="mb-4 w-full sm:w-64"
          />

          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DNI</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-44">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow><TableCell colSpan={6}><SkeletonTable columns={5} rows={3} /></TableCell></TableRow>
              ) : (data?.data ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay pacientes registrados</TableCell></TableRow>
              ) : (
                (data?.data ?? []).map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono">{p.dni}</TableCell>
                    <TableCell>{p.first_name} {p.first_last_name} {p.second_last_name ?? ''}</TableCell>
                    <TableCell>{p.phone ?? '-'}</TableCell>
                    <TableCell>{p.email ?? '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Link to={`/pacientes/${p.id}/historial`}><Button variant="outline" size="sm">Historial</Button></Link>
                        {canEdit('pacientes') && (
                          <>
                            <Link to={`/pacientes/${p.id}/editar`}><Button variant="outline" size="sm">Editar</Button></Link>
                            <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(p.id)}>Eliminar</Button>
                          </>
                        )}
                        {p.portal_token && (
                          <Button variant="outline" size="sm" onClick={() => setQrPatient({ token: p.portal_token, name: `${p.first_name} ${p.first_last_name}` })}>
                            <QrCode className="w-3.5 h-3.5 mr-1" />
                            QR
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>

          <MobileCardList
            items={data?.data ?? []}
            keyFn={(p: any) => p.id}
            renderCard={(p: any) => (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{p.first_name} {p.first_last_name} {p.second_last_name ?? ''}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.dni}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.phone ?? '-'}</span>
                  <span>{p.email ?? '-'}</span>
                </div>
                <div className="flex gap-1 pt-1 flex-wrap">
                  <Link to={`/pacientes/${p.id}/historial`}><Button variant="outline" size="sm">Historial</Button></Link>
                  {canEdit('pacientes') && (
                    <>
                      <Link to={`/pacientes/${p.id}/editar`}><Button variant="outline" size="sm">Editar</Button></Link>
                      <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(p.id)}>Eliminar</Button>
                    </>
                  )}
                  {p.portal_token && (
                    <Button variant="outline" size="sm" onClick={() => setQrPatient({ token: p.portal_token, name: `${p.first_name} ${p.first_last_name}` })}>
                      <QrCode className="w-3.5 h-3.5 mr-1" />
                      QR
                    </Button>
                  )}
                </div>
              </>
            )}
          />

          {data?.meta && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>Página {data.meta.current_page} de {data.meta.last_page}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!data.meta.prev} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={!data.meta.next} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar paciente"
        description="¿Estás seguro de eliminar este paciente? Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <PortalUrlDialog
        open={qrPatient !== null}
        onOpenChange={(o) => { if (!o) setQrPatient(null) }}
        portalToken={qrPatient?.token}
        patientName={qrPatient?.name}
      />
    </div>
  )
}
