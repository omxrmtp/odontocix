import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/lib/endpoints'
import { usePermission } from '@/hooks/usePermission'
import PageHeader from '@/components/app/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MessageCircle, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react'

const WEBHOOK_URL = `${window.location.origin}/api/webhooks/whatsapp/inbound`

export default function WhatsappSettingsPage() {
  const queryClient = useQueryClient()
  const canEdit = usePermission('configuracion.editar')

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-settings'],
    queryFn: () => profileApi.whatsappSettings(),
  })

  const [form, setForm] = useState({
    phone_number_id: '',
    business_account_id: '',
    access_token: '',
    app_secret: '',
    webhook_verify_token: '',
    enabled: false,
  })

  // Sync form when data loads
  useState(() => {
    if (data) {
      setForm({
        phone_number_id: data.phone_number_id ?? '',
        business_account_id: data.business_account_id ?? '',
        access_token: '',
        app_secret: '',
        webhook_verify_token: '',
        enabled: data.enabled ?? false,
      })
    }
  })

  const mutation = useMutation({
    mutationFn: profileApi.updateWhatsappSettings,
    onSuccess: () => {
      toast.success('Configuración de WhatsApp guardada.')
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] })
      setForm((f) => ({ ...f, access_token: '', app_secret: '', webhook_verify_token: '' }))
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Error al guardar.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Record<string, unknown> = {}
    if (form.phone_number_id) payload.phone_number_id = form.phone_number_id
    if (form.business_account_id) payload.business_account_id = form.business_account_id
    if (form.access_token) payload.access_token = form.access_token
    if (form.app_secret) payload.app_secret = form.app_secret
    if (form.webhook_verify_token) payload.webhook_verify_token = form.webhook_verify_token
    payload.enabled = form.enabled
    mutation.mutate(payload)
  }

  const copyWebhook = () => {
    navigator.clipboard.writeText(WEBHOOK_URL)
    toast.success('URL del webhook copiada.')
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <PageHeader title="WhatsApp" description="Configuración de integración con Meta" />
        <div className="h-32 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader title="WhatsApp" description="Conecta tu clínica con WhatsApp para automatizar citas y recordatorios" />

      {/* Estado */}
      <div className="flex items-center gap-2">
        {data?.enabled ? (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="w-3 h-3" /> Activado
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="w-3 h-3" /> Desactivado
          </Badge>
        )}
        {data?.phone_number_id && (
          <Badge variant="outline">Phone ID: {data.phone_number_id}</Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos de conexión */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Credenciales de Meta
            </CardTitle>
            <CardDescription>
              Estos datos los obtienes desde{" "}
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Meta Developers <ExternalLink className="w-3 h-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone_number_id">Phone Number ID</Label>
                <Input
                  id="phone_number_id"
                  value={form.phone_number_id}
                  onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                  placeholder="123456789012345"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_account_id">Business Account ID</Label>
                <Input
                  id="business_account_id"
                  value={form.business_account_id}
                  onChange={(e) => setForm({ ...form, business_account_id: e.target.value })}
                  placeholder="123456789"
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="access_token">
                Access Token
                {data?.has_access_token && (
                  <span className="ml-2 text-xs text-muted-foreground">(Guardado: {data.access_token_last4})</span>
                )}
              </Label>
              <Input
                id="access_token"
                type="password"
                value={form.access_token}
                onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                placeholder="EAAxxxxxxxx..."
                disabled={!canEdit}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="app_secret">
                  App Secret
                  {data?.has_app_secret && (
                    <span className="ml-2 text-xs text-green-600">Guardado</span>
                  )}
                </Label>
                <Input
                  id="app_secret"
                  type="password"
                  value={form.app_secret}
                  onChange={(e) => setForm({ ...form, app_secret: e.target.value })}
                  placeholder="Opcional — para verificar firma de webhook"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook_verify_token">
                  Webhook Verify Token
                  {data?.has_webhook_verify_token && (
                    <span className="ml-2 text-xs text-green-600">Guardado</span>
                  )}
                </Label>
                <Input
                  id="webhook_verify_token"
                  type="password"
                  value={form.webhook_verify_token}
                  onChange={(e) => setForm({ ...form, webhook_verify_token: e.target.value })}
                  placeholder="Token para verificar el webhook en Meta"
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="enabled" className="text-base">Activar integración</Label>
                <p className="text-sm text-muted-foreground">
                  Habilita el bot de WhatsApp y los recordatorios automáticos.
                </p>
              </div>
              <input
                id="enabled"
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Webhook info */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook</CardTitle>
            <CardDescription>
              Configura esta URL y token en Meta Developers → WhatsApp → Webhooks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL del webhook</Label>
              <div className="flex gap-2">
                <Input readOnly value={WEBHOOK_URL} className="font-mono text-sm" />
                <Button type="button" variant="outline" size="icon" onClick={copyWebhook}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Token de verificación</Label>
              <Input
                readOnly
                value="c4eed4c66d2001c56bb7ab03ebed989a10649cfdfabcf3216b1ef8688da4bfea"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Si cambias este token, actualízalo también en Meta Developers.
              </p>
            </div>
          </CardContent>
        </Card>

        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Guardando...' : 'Guardar configuración'}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}
