import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { comprobantesApi } from '@/lib/endpoints'
import { downloadPdf } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import MobileCardList from '@/components/app/MobileCardList'
import SkeletonTable from '@/components/app/SkeletonTable'
import { usePermission } from '@/hooks/usePermission'

const estadoVariant: Record<string, string> = {
  pendiente: 'secondary',
  enviado: 'secondary',
  aceptado: 'default',
  aceptado_con_observaciones: 'secondary',
  rechazado: 'destructive',
  error: 'destructive',
}

const tipoDocLabel: Record<string, string> = { '01': 'Factura', '03': 'Boleta' }

export default function ComprobantesPage() {
  const queryClient = useQueryClient()
  const { canEdit } = usePermission()
  const canEditPayments = canEdit('pagos')
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [tipoDoc, setTipoDoc] = useState('')

  const { data: comprobantes, isPending: loading } = useQuery({
    queryKey: ['comprobantes', search, estado, tipoDoc],
    queryFn: () => comprobantesApi.list({
      search,
      ...(estado && estado !== 'todos' ? { estado } : {}),
      ...(tipoDoc && tipoDoc !== 'todos' ? { tipo_doc: tipoDoc } : {}),
    }),
  })

  const resendMutation = useMutation({
    mutationFn: (id: number) => comprobantesApi.resend(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comprobantes'] }); toast.success('Comprobante reencolado para envío') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })

  const downloadFile = (url: string, filename: string) => {
    downloadPdf(url)
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch((e) => toast.error(e?.message ?? 'Error al descargar'))
  }

  const downloadPdfComprobante = (c: any) => {
    downloadFile(comprobantesApi.pdfUrl(c.id), `${c.serie}-${String(c.correlativo).padStart(8, '0')}.pdf`)
  }
  const downloadXml = (c: any) => {
    downloadFile(comprobantesApi.xmlUrl(c.id), `${c.serie}-${String(c.correlativo).padStart(8, '0')}.xml`)
  }
  const downloadCdr = (c: any) => {
    downloadFile(comprobantesApi.cdrUrl(c.id), `R-${c.serie}-${String(c.correlativo).padStart(8, '0')}.zip`)
  }

  const renderActions = (c: any) => (
    <div className="flex gap-1 flex-wrap">
      <Button variant="outline" size="sm" onClick={() => downloadPdfComprobante(c)}>PDF</Button>
      <Button variant="outline" size="sm" onClick={() => downloadXml(c)}>XML</Button>
      {c.cdr_zip_path && <Button variant="outline" size="sm" onClick={() => downloadCdr(c)}>CDR</Button>}
      {canEditPayments && ['rechazado', 'error'].includes(c.estado) && (
        <Button variant="secondary" size="sm" onClick={() => resendMutation.mutate(c.id)} disabled={resendMutation.isPending}>Reenviar</Button>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold flex-shrink-0">Comprobantes SUNAT</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Input placeholder="Buscar por serie, documento o nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
          <Select value={estado} onValueChange={setEstado}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="aceptado">Aceptado</SelectItem>
              <SelectItem value="aceptado_con_observaciones">Aceptado c/ observaciones</SelectItem>
              <SelectItem value="rechazado">Rechazado</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipoDoc} onValueChange={setTipoDoc}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="03">Boleta</SelectItem>
              <SelectItem value="01">Factura</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comprobante</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-52">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <SkeletonTable columns={7} rows={3} />
                ) : (comprobantes?.data ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay comprobantes</TableCell></TableRow>
                ) : (
                  (comprobantes?.data ?? []).map((c: any) => (
                    <TableRow key={c.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono">{c.serie}-{String(c.correlativo).padStart(8, '0')}</TableCell>
                      <TableCell>{c.name ?? '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{tipoDocLabel[c.tipo_doc]} {c.doc_number ?? '-'}</TableCell>
                      <TableCell className="font-mono">S/ {Number(c.mto_imp_venta ?? 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={(estadoVariant[c.estado] ?? 'secondary') as any}>{c.estado_label ?? c.estado}</Badge>
                      </TableCell>
                      <TableCell>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{renderActions(c)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <MobileCardList
            items={comprobantes?.data ?? []}
            keyFn={(c: any) => c.id}
            renderCard={(c: any) => (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{c.serie}-{String(c.correlativo).padStart(8, '0')}</span>
                  <Badge variant={(estadoVariant[c.estado] ?? 'secondary') as any}>{c.estado_label ?? c.estado}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span>{c.name ?? '-'}</span>
                  <span className="ml-2">{tipoDocLabel[c.tipo_doc]} {c.doc_number}</span>
                </div>
                <div className="font-mono text-sm">S/ {Number(c.mto_imp_venta ?? 0).toFixed(2)}</div>
                <div className="pt-1">{renderActions(c)}</div>
              </>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
