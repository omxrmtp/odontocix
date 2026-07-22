import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { patientsApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { onlyDigits, onlyLetters, onlyPhoneChars, cleanInput, showFirstError } from '@/lib/validation'
import PageHeader from '@/components/app/PageHeader'
import { PortalUrlDialog } from '@/components/app/PortalUrlDialog'
import { QrCode } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

export default function PatientFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [form, setForm] = useState({
    dni: '', first_name: '', second_name: '', first_last_name: '', second_last_name: '',
    birth_date: '', gender: '', phone: '', email: '', address: '',
    reference: '', notes: '',
  })
  const [portalToken, setPortalToken] = useState<string | null>(null)
  const [qrOpen, setQrOpen] = useState(false)
  const { canEdit } = usePermission()
  const canEditPatients = canEdit('pacientes')

  useEffect(() => {
    if (id) {
      patientsApi.show(Number(id)).then((p) => {
        setForm({
          dni: p.dni ?? '',
          first_name: p.first_name ?? '',
          second_name: p.second_name ?? '',
          first_last_name: p.first_last_name ?? '',
          second_last_name: p.second_last_name ?? '',
          birth_date: p.birth_date ?? '',
          gender: p.gender ?? '',
          phone: p.phone ?? '',
          email: p.email ?? '',
          address: p.address ?? '',
          reference: p.reference ?? '',
          notes: p.observations ?? '',
        })
        setPortalToken(p.portal_token ?? null)
      })
    }
  }, [id])

  const handleLookup = async () => {
    if (form.dni.length !== 8) return toast.error('DNI debe tener 8 dígitos')
    setLookupLoading(true)
    try {
      const res = await patientsApi.lookup(form.dni)
      if (res.error) return toast.error(res.error)
      const d = res.data
      const names = (d.first_name ?? '').split(' ')
      setForm(f => ({
        ...f,
        first_name: names[0] || f.first_name,
        second_name: names.slice(1).join(' ') || f.second_name,
        first_last_name: d.first_last_name ?? f.first_last_name,
        second_last_name: d.second_last_name ?? f.second_last_name,
        birth_date: d.birth_date ?? f.birth_date,
        gender: d.gender ?? f.gender,
        phone: d.phone ?? f.phone,
        email: d.email ?? f.email,
        address: d.address ?? f.address,
        reference: d.reference ?? f.reference,
        notes: d.observations ?? d.notes ?? f.notes,
      }))
      toast.success(`Datos obtenidos de ${res.source === 'cache' ? 'caché local' : 'RENIEC'}`)
    } catch {
      toast.error('No se pudo consultar RENIEC')
    } finally {
      setLookupLoading(false)
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!form.dni || form.dni.length !== 8) newErrors.dni = 'DNI debe tener 8 dígitos'
    if (!form.first_name.trim()) newErrors.first_name = 'Nombres es requerido'
    if (!form.first_last_name.trim()) newErrors.first_last_name = 'Apellido paterno es requerido'
    if (!form.phone.trim()) newErrors.phone = 'Teléfono es requerido'
    else if (form.phone.replace(/\D/g, '').length < 7) newErrors.phone = 'Teléfono inválido'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Email inválido'
    setErrors(newErrors)
    showFirstError(newErrors, toast)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { notes, ...rest } = form
      const payload = {
        ...rest,
        email: rest.email?.trim() || null,
        observations: notes?.trim() || null,
      }
      if (isEdit) await patientsApi.update(Number(id), payload)
      else await patientsApi.create(payload)
      toast.success(isEdit ? 'Paciente actualizado' : 'Paciente creado')
      navigate('/pacientes')
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Error al guardar'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const filtered = (
      name === 'dni' ? cleanInput(value, 'digits') :
      name === 'phone' ? cleanInput(value, 'phone') :
      ['first_name', 'second_name', 'first_last_name', 'second_last_name'].includes(name) ? cleanInput(value, 'letters') :
      value
    )
    setForm(f => ({ ...f, [name]: filtered }))
    if (errors[name]) setErrors(prev => { const copy = { ...prev }; delete copy[name]; return copy })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {!canEditPatients && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="py-4 text-red-700 text-sm font-medium">
            {isEdit ? 'Sin permisos para editar' : 'Sin permisos para crear pacientes'}
          </CardContent>
        </Card>
      )}

      <PageHeader
        title={isEdit ? 'Editar paciente' : 'Nuevo paciente'}
        backTo="/pacientes"
        actions={
          <div className="flex gap-2">
            {isEdit && portalToken && (
              <Button type="button" variant="outline" onClick={() => setQrOpen(true)}>
                <QrCode className="w-4 h-4 mr-1" />
                QR Portal
              </Button>
            )}
            {canEditPatients && <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>}
          </div>
        }
      />

      <Card>
        <CardHeader><CardTitle>Datos personales</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label>DNI</Label>
              <Input name="dni" value={form.dni} onChange={handleChange} onKeyDown={onlyDigits} maxLength={8} placeholder="12345678" className={errors.dni ? 'border-red-500' : ''} disabled={!canEditPatients} />
            </div>
            <Button type="button" variant="outline" onClick={handleLookup} disabled={lookupLoading || !canEditPatients}>
              {lookupLoading ? '...' : 'RENIEC'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Nombres</Label><Input name="first_name" value={form.first_name} onChange={handleChange} onKeyDown={onlyLetters} required className={errors.first_name ? 'border-red-500' : ''} disabled={!canEditPatients} /></div>
            <div className="space-y-1"><Label>Segundo nombre</Label><Input name="second_name" value={form.second_name} onChange={handleChange} onKeyDown={onlyLetters} disabled={!canEditPatients} /></div>
            <div className="space-y-1"><Label>Apellido paterno</Label><Input name="first_last_name" value={form.first_last_name} onChange={handleChange} onKeyDown={onlyLetters} required className={errors.first_last_name ? 'border-red-500' : ''} disabled={!canEditPatients} /></div>
            <div className="space-y-1"><Label>Apellido materno</Label><Input name="second_last_name" value={form.second_last_name} onChange={handleChange} onKeyDown={onlyLetters} disabled={!canEditPatients} /></div>
            <div className="space-y-1"><Label>Fecha de nacimiento</Label><Input name="birth_date" type="date" value={form.birth_date} onChange={handleChange} disabled={!canEditPatients} /></div>
            <div className="space-y-1"><Label>Género</Label><select name="gender" value={form.gender} onChange={handleChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!canEditPatients}><option value="">Seleccionar</option><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
            <div className="space-y-1"><Label>Teléfono</Label><Input name="phone" type="tel" value={form.phone} onChange={handleChange} onKeyDown={onlyPhoneChars} className={errors.phone ? 'border-red-500' : ''} disabled={!canEditPatients} /></div>
            <div className="space-y-1"><Label>Email (Opcional)</Label><Input name="email" type="email" value={form.email} onChange={handleChange} disabled={!canEditPatients} /></div>
          </div>
          <div className="space-y-1"><Label>Dirección</Label><Input name="address" value={form.address} onChange={handleChange} placeholder="Opcional" disabled={!canEditPatients} /></div>
          <div className="space-y-1"><Label>Referencia</Label><Input name="reference" value={form.reference} onChange={handleChange} placeholder="Opcional" disabled={!canEditPatients} /></div>
          <div className="space-y-1"><Label>Notas</Label><textarea name="notes" value={form.notes} onChange={handleChange} className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Opcional" disabled={!canEditPatients} /></div>
        </CardContent>
      </Card>

      <PortalUrlDialog
        open={qrOpen}
        onOpenChange={setQrOpen}
        portalToken={portalToken}
        patientName={[form.first_name, form.first_last_name].filter(Boolean).join(' ')}
      />
    </form>
  )
}
