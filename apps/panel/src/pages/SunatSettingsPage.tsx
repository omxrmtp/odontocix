import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/lib/endpoints'
import { usePermission } from '@/hooks/usePermission'
import PageHeader from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { FileCheck, KeyRound, ShieldCheck, ExternalLink, Landmark } from 'lucide-react'

export default function SunatSettingsPage() {
  const queryClient = useQueryClient()
  const canEdit = usePermission('configuracion.editar')

  const { data, isLoading } = useQuery({
    queryKey: ['sunat-settings'],
    queryFn: () => profileApi.sunatSettings(),
  })

  const [form, setForm] = useState({
    enabled: false,
    environment: 'beta',
    serie_boleta: 'B001',
    serie_factura: 'F001',
    certificate: '',
    certificate_password: '',
    sol_user: '',
    sol_password: '',
  })
  const [loaded, setLoaded] = useState(false)

  if (data && !loaded) {
    setForm({
      enabled: !!data.enabled,
      environment: data.environment ?? 'beta',
      serie_boleta: data.serie_boleta ?? 'B001',
      serie_factura: data.serie_factura ?? 'F001',
      certificate: '',
      certificate_password: '',
      sol_user: '',
      sol_password: '',
    })
    setLoaded(true)
  }

  const mutation = useMutation({
    mutationFn: (d: typeof form) => profileApi.updateSunatSettings(d as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Configuración de facturación SUNAT guardada.')
      queryClient.invalidateQueries({ queryKey: ['sunat-settings'] })
      setForm((f) => ({ ...f, certificate: '', certificate_password: '', sol_user: '', sol_password: '' }))
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Error al guardar.')
    },
  })

  const testMutation = useMutation({
    mutationFn: () => profileApi.testSunatSettings(),
    onSuccess: (res: any) => {
      toast.success(res?.message ?? 'Conexión correcta.')
      if (res?.certificate?.expires_at) {
        toast.info(`Certificado válido hasta ${res.certificate.expires_at}`)
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al probar la conexión'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  const readPfxFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = String(reader.result ?? '').split(',')[1] ?? ''
      setForm((f) => ({ ...f, certificate: base64 }))
    }
    reader.readAsDataURL(file)
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="Facturación SUNAT" description="Configuración de facturación electrónica" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  const environment = form.environment === 'produccion' ? 'Producción' : 'Beta (pruebas)'

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader title="Facturación SUNAT" description="Emite boletas y facturas electrónicas desde tu clínica" />

      {/* Estado */}
      <div className="flex items-center gap-2 flex-wrap">
        {data?.enabled ? (
          <Badge variant="default" className="gap-1">
            <ShieldCheck className="w-3 h-3" /> Activado
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="w-3 h-3" /> Desactivado
          </Badge>
        )}
        <Badge variant="outline">
          <Landmark className="w-3 h-3" /> Ambiente: {environment}
        </Badge>
        {data?.ruc && (
          <Badge variant="outline">RUC: {data.ruc}</Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Certificado digital */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Certificado Digital SUNAT
            </CardTitle>
            <CardDescription>
              Tu certificado digital (.pfx) se usa para firmar los comprobantes antes de enviarlos a SUNAT. Lo obtienes
              en el{" "}
              <a
                href="https://www.sunat.gob.pe"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                portal de SUNAT <ExternalLink className="w-3 h-3" />
              </a>{" "}
              (SUNAT Operaciones en Línea → Certificado Digital).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sunat-certificate">
                Archivo .pfx / .p12
                {data?.has_certificate && (
                  <span className="ml-2 text-xs text-green-600">
                    Guardado ({data.certificate_name || 'sin nombre'})
                  </span>
                )}
              </Label>
              <Input
                id="sunat-certificate"
                type="file"
                accept=".pfx,.p12"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  if (file) readPfxFile(file)
                }}
                className="cursor-pointer"
                disabled={!canEdit}
              />
              {data?.has_certificate && (
                <p className="text-xs text-muted-foreground">
                  Si no seleccionas un archivo, se mantiene el certificado actual.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sunat-certificate-password">
                Contraseña del certificado
                {data?.has_certificate_password && (
                  <span className="ml-2 text-xs text-green-600">Guardada</span>
                )}
              </Label>
              <Input
                id="sunat-certificate-password"
                type="password"
                autoComplete="off"
                value={form.certificate_password}
                placeholder={data?.has_certificate_password ? '••••••••' : 'Contraseña del .pfx'}
                onChange={(e) => setForm((f) => ({ ...f, certificate_password: e.target.value }))}
                disabled={!canEdit}
              />
              {data?.has_certificate_password && (
                <p className="text-xs text-muted-foreground">Deja vacío para mantenerla.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Clave SOL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Credenciales Clave SOL
            </CardTitle>
            <CardDescription>
              Usadas para autenticar el envío de comprobantes a los web services de SUNAT. Las obtienes en
              SUNAT Operaciones en Línea → Clave SOL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sunat-sol-user">Usuario</Label>
              <Input
                id="sunat-sol-user"
                autoComplete="off"
                value={form.sol_user}
                placeholder={data?.has_sol_user ? 'Configurado (dejar vacío para mantener)' : 'Ej: MODDATOS'}
                onChange={(e) => setForm((f) => ({ ...f, sol_user: e.target.value }))}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sunat-sol-password">
                Contraseña
                {data?.has_sol_password && (
                  <span className="ml-2 text-xs text-green-600">Guardada</span>
                )}
              </Label>
              <Input
                id="sunat-sol-password"
                type="password"
                autoComplete="off"
                value={form.sol_password}
                placeholder={data?.has_sol_password ? '••••••••' : 'Contraseña de Clave SOL'}
                onChange={(e) => setForm((f) => ({ ...f, sol_password: e.target.value }))}
                disabled={!canEdit}
              />
              {data?.has_sol_password && (
                <p className="text-xs text-muted-foreground">Deja vacío para mantenerla.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Series y emisión */}
        <Card>
          <CardHeader>
            <CardTitle>Series y emisión</CardTitle>
            <CardDescription>
              Define las series de boletas y facturas, y el ambiente de SUNAT al que se enviarán los comprobantes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sunat-environment">Ambiente</Label>
              <Select
                value={form.environment}
                onValueChange={(v) => setForm((f) => ({ ...f, environment: v }))}
                disabled={!canEdit}
              >
                <SelectTrigger id="sunat-environment" className="w-full md:max-w-xs">
                  <SelectValue placeholder="Seleccionar ambiente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beta">Beta (pruebas)</SelectItem>
                  <SelectItem value="produccion">Producción</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Usa Beta para probar con el certificado de prueba; cambia a Producción solo cuando tengas tu
                certificado y Clave SOL reales.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sunat-serie-boleta">Serie Boleta</Label>
                <Input
                  id="sunat-serie-boleta"
                  value={form.serie_boleta}
                  maxLength={4}
                  onChange={(e) => setForm((f) => ({ ...f, serie_boleta: e.target.value.toUpperCase() }))}
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground">
                  Correlativo actual: {data?.correlative_boleta ?? 0}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sunat-serie-factura">Serie Factura</Label>
                <Input
                  id="sunat-serie-factura"
                  value={form.serie_factura}
                  maxLength={4}
                  onChange={(e) => setForm((f) => ({ ...f, serie_factura: e.target.value.toUpperCase() }))}
                  disabled={!canEdit}
                />
                <p className="text-xs text-muted-foreground">
                  Correlativo actual: {data?.correlative_factura ?? 0}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="sunat-enabled" className="text-base">Activar facturación electrónica</Label>
                <p className="text-sm text-muted-foreground">
                  Al activarse, cada pago registrado emitirá una boleta automáticamente.
                </p>
              </div>
              <input
                id="sunat-enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        {canEdit && (
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? 'Probando...' : 'Probar conexión'}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
