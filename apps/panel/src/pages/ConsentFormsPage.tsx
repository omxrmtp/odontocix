import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { consentFormsApi, consentTemplatesApi, patientsApi, downloadConsentFormPdf } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import MobileCardList from '@/components/app/MobileCardList'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import SkeletonTable from '@/components/app/SkeletonTable'
import { FileDown, PenLine, Trash2, Eye, FileSignature } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

interface SignaturePadProps {
  onSignature: (dataUrl: string) => void
  onClear: () => void
  readOnly?: boolean
}

function SignaturePad({ onSignature, onClear, readOnly }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setIsDrawing(true)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const handleClear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    onClear()
  }

  const handleSave = () => {
    const canvas = canvasRef.current!
    // Check if canvas is empty (simple check by getting pixel data)
    const blank = document.createElement('canvas')
    blank.width = canvas.width
    blank.height = canvas.height
    if (canvas.toDataURL() === blank.toDataURL()) {
      toast.error('Por favor dibuje su firma antes de guardar')
      return
    }
    onSignature(canvas.toDataURL('image/png'))
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={400}
        height={150}
        className={`w-full border rounded-md bg-white touch-none ${readOnly ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
        style={{ maxWidth: 400, height: 150 }}
        onMouseDown={readOnly ? undefined : startDrawing}
        onMouseMove={readOnly ? undefined : draw}
        onMouseUp={readOnly ? undefined : stopDrawing}
        onMouseLeave={readOnly ? undefined : stopDrawing}
        onTouchStart={readOnly ? undefined : startDrawing}
        onTouchMove={readOnly ? undefined : draw}
        onTouchEnd={readOnly ? undefined : stopDrawing}
      />
      {!readOnly && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClear}>Limpiar</Button>
          <Button size="sm" onClick={handleSave}>Confirmar firma</Button>
        </div>
      )}
    </div>
  )
}

export default function ConsentFormsPage() {
  const queryClient = useQueryClient()
  const { canEdit } = usePermission()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [selectedForm, setSelectedForm] = useState<any>(null)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [isGuardian, setIsGuardian] = useState(false)

  const [form, setForm] = useState<Record<string, string>>({
    patient_id: '',
    template_id: '',
    title: '',
    content: '',
    guardian_name: '',
    guardian_dni: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { data: formsData, isPending: loadingForms } = useQuery({
    queryKey: ['consent-forms', search, statusFilter],
    queryFn: () => consentFormsApi.list({ search, status: statusFilter }),
  })
  const { data: patientsData, isPending: loadingPatients } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => patientsApi.list({ per_page: '100' }),
  })
  const { data: templatesData, isPending: loadingTemplates } = useQuery({
    queryKey: ['consent-templates'],
    queryFn: () => consentTemplatesApi.list(),
  })

  const forms = formsData?.data ?? []

  const createMutation = useMutation({
    mutationFn: (d: Record<string, unknown>) => consentFormsApi.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent-forms'] })
      setDialogOpen(false)
      toast.success('Consentimiento creado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => consentFormsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent-forms'] })
      setDialogOpen(false)
      toast.success('Consentimiento actualizado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: number) => consentFormsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent-forms'] })
      toast.success('Consentimiento eliminado')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error'),
  })
  const signMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => consentFormsApi.sign(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consent-forms'] })
      queryClient.invalidateQueries({ queryKey: ['consent-form', selectedForm?.id] })
      setSignatureData(null)
      setViewDialogOpen(false)
      toast.success('Consentimiento firmado correctamente')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al firmar'),
  })

  const openNew = () => {
    setEditId(null)
    setForm({ patient_id: '', template_id: '', title: '', content: '', guardian_name: '', guardian_dni: '' })
    setErrors({})
    setDialogOpen(true)
  }

  const openEdit = (f: any) => {
    setEditId(f.id)
    setForm({
      patient_id: String(f.patient_id),
      template_id: '',
      title: f.title,
      content: f.content,
      guardian_name: f.guardian_name ?? '',
      guardian_dni: f.guardian_dni ?? '',
    })
    setErrors({})
    setDialogOpen(true)
  }

  const openView = async (f: any) => {
    setSelectedForm(f)
    setSignatureData(null)
    setIsGuardian(false)
    try {
      const full = await consentFormsApi.show(f.id)
      setSelectedForm(full)
      setViewDialogOpen(true)
    } catch {
      setViewDialogOpen(true)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    setForm(f => ({ ...f, template_id: templateId }))
    if (!templateId) return
    const tpl = templatesData?.find((t: any) => String(t.id) === templateId)
    if (tpl) {
      setForm(f => ({ ...f, title: tpl.title, content: tpl.content }))
    }
  }

  const handleSave = () => {
    const newErrors: Record<string, string> = {}
    if (!form.patient_id) newErrors.patient_id = 'Seleccione un paciente'
    if (!form.title.trim()) newErrors.title = 'Ingrese un título'
    if (!form.content.trim()) newErrors.content = 'Ingrese el contenido'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      toast.error(Object.values(newErrors)[0])
      return
    }
    const data = {
      patient_id: Number(form.patient_id),
      title: form.title.trim(),
      content: form.content.trim(),
    }
    if (editId) updateMutation.mutate({ id: editId, data })
    else createMutation.mutate(data)
  }

  const handleSign = (signature: string) => {
    if (!selectedForm) return
    signMutation.mutate({
      id: selectedForm.id,
      data: {
        signature_data: signature,
        signed_by_patient: !isGuardian,
        signed_by_guardian: isGuardian,
        guardian_name: isGuardian ? form.guardian_name : null,
        guardian_dni: isGuardian ? form.guardian_dni : null,
      },
    })
  }

  const handleDownloadPdf = async (id: number) => {
    try {
      const blob = await downloadConsentFormPdf(id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `consentimiento-${id}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Error al descargar PDF')
    }
  }

  const patients = patientsData?.data ?? []
  const templates = templatesData ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Consentimientos</h1>
        {canEdit('consentimientos') && <Button onClick={openNew}>Nuevo consentimiento</Button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          placeholder="Buscar por paciente o título..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:max-w-[180px]">
            <SelectValue placeholder="Filtrar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="signed">Firmado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-40">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingForms ? (
                <TableRow><TableCell colSpan={4}><SkeletonTable columns={3} rows={3} /></TableCell></TableRow>
              ) : forms.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No hay consentimientos registrados</TableCell></TableRow>
              ) : (
                forms.map((f: any) => (
                  <TableRow key={f.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      {f.patient ? `${f.patient.first_name} ${f.patient.first_last_name}` : '—'}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{f.title}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${f.signed_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {f.signed_at ? 'Firmado' : 'Pendiente'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openView(f)} title="Ver">
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canEdit('consentimientos') && (
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(f)} title="Editar">
                            <PenLine className="w-4 h-4" />
                          </Button>
                        )}
                        {f.signed_at && (
                          <Button variant="ghost" size="icon-sm" onClick={() => handleDownloadPdf(f.id)} title="Descargar PDF">
                            <FileDown className="w-4 h-4" />
                          </Button>
                        )}
                        {canEdit('consentimientos') && (
                          <Button variant="ghost" size="icon-sm" onClick={() => setConfirmDelete(f.id)} title="Eliminar">
                            <Trash2 className="w-4 h-4 text-destructive" />
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
            items={forms}
            keyFn={(f: any) => f.id}
            renderCard={(f: any) => (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{f.patient ? `${f.patient.first_name} ${f.patient.first_last_name}` : '—'}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${f.signed_at ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {f.signed_at ? 'Firmado' : 'Pendiente'}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">{f.title}</div>
                <div className="flex gap-1 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openView(f)}><Eye className="w-3 h-3 mr-1" />Ver</Button>
                  {canEdit('consentimientos') && (
                    <Button variant="outline" size="sm" onClick={() => openEdit(f)}><PenLine className="w-3 h-3 mr-1" />Editar</Button>
                  )}
                  {f.signed_at && (
                    <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(f.id)}><FileDown className="w-3 h-3 mr-1" />PDF</Button>
                  )}
                  {canEdit('consentimientos') && (
                    <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(f.id)}><Trash2 className="w-3 h-3 mr-1" /></Button>
                  )}
                </div>
              </>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => { if (!o) setConfirmDelete(null) }}
        title="Eliminar consentimiento"
        description="¿Estás seguro de eliminar este consentimiento? Esta acción no se puede deshacer."
        onConfirm={() => { if (confirmDelete !== null) { deleteMutation.mutate(confirmDelete); setConfirmDelete(null) } }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? 'Editar consentimiento' : 'Nuevo consentimiento'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Paciente</Label>
              <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))} disabled={!!editId}>
                <SelectTrigger className={errors.patient_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder={loadingPatients ? 'Cargando...' : 'Seleccione un paciente'} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.first_name} {p.first_last_name} ({p.dni})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editId && (
              <div className="space-y-1">
                <Label>Plantilla (opcional)</Label>
                <Select value={form.template_id} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingTemplates ? 'Cargando...' : 'Seleccione una plantilla'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Personalizado</SelectItem>
                    {templates.map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className={errors.title ? 'border-red-500' : ''}
              />
            </div>
            <div className="space-y-1">
              <Label>Contenido</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={8}
                className={errors.content ? 'border-red-500' : ''}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="w-5 h-5" />
              {selectedForm?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Paciente: <span className="font-medium text-foreground">
                {selectedForm?.patient?.first_name} {selectedForm?.patient?.first_last_name}
              </span>
            </div>
            <div className="border rounded-md p-3 bg-muted/30 text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: selectedForm?.content ?? '' }} />

            {selectedForm?.signed_at ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                  <FileSignature className="w-4 h-4" />
                  Firmado el {new Date(selectedForm.signed_at).toLocaleString('es-PE')}
                </div>
                {selectedForm.signature_data && (
                  <img src={selectedForm.signature_data} alt="Firma" className="max-w-[250px] border rounded bg-white" />
                )}
                {selectedForm.signed_by_guardian && (
                  <div className="text-sm text-muted-foreground">
                    Firmado por apoderado: {selectedForm.guardian_name} (DNI: {selectedForm.guardian_dni})
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={() => selectedForm && handleDownloadPdf(selectedForm.id)}>
                  <FileDown className="w-4 h-4 mr-2" /> Descargar PDF
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isGuardian"
                    checked={isGuardian}
                    onChange={e => setIsGuardian(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isGuardian" className="cursor-pointer text-sm">Es menor de edad (firmar como apoderado)</Label>
                </div>
                {isGuardian && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre del apoderado</Label>
                      <Input value={form.guardian_name} onChange={e => setForm(f => ({ ...f, guardian_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">DNI del apoderado</Label>
                      <Input value={form.guardian_dni} onChange={e => setForm(f => ({ ...f, guardian_dni: e.target.value }))} />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Firma aquí:</Label>
                  <SignaturePad
                    onSignature={(sig) => handleSign(sig)}
                    onClear={() => setSignatureData(null)}
                    readOnly={!canEdit('consentimientos')}
                  />
                </div>
                {signatureData && (
                  <img src={signatureData} alt="Vista previa de firma" className="max-w-[200px] border rounded bg-white" />
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
