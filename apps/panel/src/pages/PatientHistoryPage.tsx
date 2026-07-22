import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientsApi, downloadPatientHistory, recordsApi, patientTreatmentsApi, odontogramApi, treatmentsApi, doctorsApi } from '@/lib/endpoints'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import PageHeader from '@/components/app/PageHeader'
import MobileCardList from '@/components/app/MobileCardList'
import ConfirmDialog from '@/components/app/ConfirmDialog'
import { usePermission } from '@/hooks/usePermission'
import OdontogramComponent from '@/components/odontogram/Odontogram'

const genderLabel: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' }

const treatmentStatusLabel: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En progreso', completed: 'Completado', cancelled: 'Cancelado',
}

export default function PatientHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { canEdit } = usePermission()
  const canEditHistory = canEdit('historia')

  const [tab, setTab] = useState<'records' | 'treatments' | 'odontogram'>('records')
  const [recordDialog, setRecordDialog] = useState(false)
  const [recordForm, setRecordForm] = useState({ doctor_id: '', record_date: '', reason: '', diagnosis: '', notes: '' })
  const [editingRecord, setEditingRecord] = useState<number | null>(null)

  const [treatmentDialog, setTreatmentDialog] = useState(false)
  const [treatmentForm, setTreatmentForm] = useState({ treatment_id: '', doctor_id: '', status: 'pending', agreed_price: '', tooth_fdi: '' })
  const [editingTreatment, setEditingTreatment] = useState<number | null>(null)

  const [toothDialog, setToothDialog] = useState(false)
  const [selectedTooth, setSelectedTooth] = useState('')
  const [toothForm, setToothForm] = useState({ status: 'sano', notes: '' })
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<number | null>(null)
  const [confirmDeleteTreatment, setConfirmDeleteTreatment] = useState<number | null>(null)

  const patientId = Number(id)

  const { data: patient, isPending } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.show(patientId),
  })

  const { data: history } = useQuery({
    queryKey: ['patient-history', patientId],
    queryFn: () => patientsApi.history(patientId),
    enabled: !!patientId,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['patient-history', patientId] })
  }

  const createRecord = useMutation({
    mutationFn: (data: any) => recordsApi.create(patientId, data),
    onSuccess: () => { invalidate(); setRecordDialog(false); toast.success('Registro creado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear registro'),
  })

  const updateRecord = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => recordsApi.update(id, data),
    onSuccess: () => { invalidate(); setRecordDialog(false); toast.success('Registro actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar registro'),
  })

  const deleteRecord = useMutation({
    mutationFn: (id: number) => recordsApi.delete(id),
    onSuccess: () => { invalidate(); setConfirmDeleteRecord(null); toast.success('Registro eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al eliminar registro'),
  })

  const createTreatment = useMutation({
    mutationFn: (data: any) => patientTreatmentsApi.create(patientId, data),
    onSuccess: () => { invalidate(); setTreatmentDialog(false); toast.success('Tratamiento creado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al crear tratamiento'),
  })

  const updateTreatment = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => patientTreatmentsApi.update(id, data),
    onSuccess: () => { invalidate(); setTreatmentDialog(false); toast.success('Tratamiento actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar tratamiento'),
  })

  const deleteTreatment = useMutation({
    mutationFn: (id: number) => patientTreatmentsApi.delete(id),
    onSuccess: () => { invalidate(); setConfirmDeleteTreatment(null); toast.success('Tratamiento eliminado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al eliminar tratamiento'),
  })

  const updateTooth = useMutation({
    mutationFn: (d: any) => odontogramApi.update(Number(id), d.fdi, { status: d.status, notes: d.notes }),
    onSuccess: () => { invalidate(); setToothDialog(false); toast.success('Odontograma actualizado') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Error al actualizar diente'),
  })

  const { data: treatmentsList } = useQuery({ queryKey: ['treatments-list'], queryFn: () => treatmentsApi.list() })
  const { data: doctorsList } = useQuery({ queryKey: ['doctors-list'], queryFn: () => doctorsApi.list() })

  if (isPending || !patient) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  const p = patient as any
  const teethRecords = (history as any)?.teethRecords ?? []
  const clinicalRecords = (history as any)?.clinicalRecords ?? []
  const treatments = (history as any)?.treatments ?? []

  const openRecordDialog = (record?: any) => {
    if (record) {
      setEditingRecord(record.id)
      setRecordForm({
        doctor_id: record.doctor_id ?? '',
        record_date: record.record_date?.split('T')[0] ?? '',
        reason: record.reason ?? '',
        diagnosis: record.diagnosis ?? '',
        notes: record.notes ?? '',
      })
    } else {
      setEditingRecord(null)
      setRecordForm({ doctor_id: '', record_date: '', reason: '', diagnosis: '', notes: '' })
    }
    setRecordDialog(true)
  }

  const openTreatmentDialog = (t?: any) => {
    if (t) {
      setEditingTreatment(t.id)
      setTreatmentForm({
        treatment_id: t.treatment_id ?? '',
        doctor_id: t.doctor_id ?? '',
        status: t.status ?? 'pending',
        agreed_price: t.agreed_price ?? '',
        tooth_fdi: t.tooth_fdi ?? '',
      })
    } else {
      setEditingTreatment(null)
      setTreatmentForm({ treatment_id: '', doctor_id: '', status: 'pending', agreed_price: '', tooth_fdi: '' })
    }
    setTreatmentDialog(true)
  }

  const openToothDialog = (fdi: string) => {
    const record = teethRecords.find((t: any) => t.fdi_code === fdi)
    setSelectedTooth(fdi)
    setToothForm({
      status: record?.status ?? 'sano',
      notes: record?.notes ?? '',
    })
    setToothDialog(true)
  }

  const handleSaveRecord = () => {
    if (!recordForm.reason.trim()) return toast.error('Motivo es requerido')
    const data = {
      doctor_id: recordForm.doctor_id || null,
      record_date: recordForm.record_date || new Date().toISOString().split('T')[0],
      reason: recordForm.reason,
      diagnosis: recordForm.diagnosis,
      notes: recordForm.notes,
    }
    if (editingRecord) {
      updateRecord.mutate({ id: editingRecord, data })
    } else {
      createRecord.mutate(data)
    }
  }

  const handleSaveTreatment = () => {
    if (!treatmentForm.treatment_id) return toast.error('Tratamiento es requerido')
    const data = {
      treatment_id: Number(treatmentForm.treatment_id),
      doctor_id: treatmentForm.doctor_id ? Number(treatmentForm.doctor_id) : null,
      status: treatmentForm.status,
      agreed_price: treatmentForm.agreed_price ? Number(treatmentForm.agreed_price) : null,
      tooth_fdi: treatmentForm.tooth_fdi || null,
    }
    if (editingTreatment) {
      updateTreatment.mutate({ id: editingTreatment, data })
    } else {
      createTreatment.mutate(data)
    }
  }

  const handleSaveTooth = () => {
    if (!toothForm.status) return toast.error('Estado es requerido')
    updateTooth.mutate({ fdi: selectedTooth, ...toothForm })
  }

  const teethData: Record<string, any> = {}
  for (const t of teethRecords) {
    teethData[t.fdi_code] = { status: t.status, notes: t.notes }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${p.first_name} ${p.first_last_name}`}
        backTo="/pacientes"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => downloadPatientHistory(p.id).then(blob => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `historia-${p.id}.pdf`; a.click(); URL.revokeObjectURL(url); }).catch(() => toast.error('Error al descargar PDF'))}>PDF</Button>
            {canEditHistory && <Link to={`/pacientes/${p.id}/editar`}><Button variant="outline" size="sm">Editar</Button></Link>}
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">DNI:</span> {p.dni}</div>
            <div><span className="text-muted-foreground">Teléfono:</span> {p.phone ?? '-'}</div>
            <div><span className="text-muted-foreground">Email:</span> {p.email ?? '-'}</div>
            <div><span className="text-muted-foreground">Sexo:</span> {genderLabel[p.gender] ?? p.gender ?? '-'}</div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 border-b">
        {(['records', 'treatments', 'odontogram'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'records' ? 'Registros clínicos' : t === 'treatments' ? 'Tratamientos' : 'Odontograma'}
          </button>
        ))}
      </div>

      {tab === 'records' && (
        <div className="space-y-4">
          {canEditHistory && (
            <div className="flex justify-end">
              <Button onClick={() => openRecordDialog()}>Nuevo registro</Button>
            </div>
          )}
          <Card>
            <CardHeader><CardTitle>Registros clínicos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                    {canEditHistory && <TableHead className="w-32">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clinicalRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={canEditHistory ? 5 : 4} className="text-center text-muted-foreground py-8">No hay registros</TableCell></TableRow>
                  ) : clinicalRecords.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.record_date ? new Date(r.record_date).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{r.doctor ? `${r.doctor.first_name} ${r.doctor.first_last_name}` : '-'}</TableCell>
                      <TableCell>{r.reason ?? '-'}</TableCell>
                      <TableCell>{r.diagnosis ?? '-'}</TableCell>
                      {canEditHistory && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => openRecordDialog(r)}>Editar</Button>
                            <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteRecord(r.id)}>Eliminar</Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'treatments' && (
        <div className="space-y-4">
          {canEditHistory && (
            <div className="flex justify-end">
              <Button onClick={() => openTreatmentDialog()}>Nuevo tratamiento</Button>
            </div>
          )}
          <Card>
            <CardHeader><CardTitle>Tratamientos</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tratamiento</TableHead>
                    <TableHead>Diente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Precio</TableHead>
                    {canEditHistory && <TableHead className="w-32">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treatments.length === 0 ? (
                    <TableRow><TableCell colSpan={canEditHistory ? 5 : 4} className="text-center text-muted-foreground py-8">No hay tratamientos</TableCell></TableRow>
                  ) : treatments.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.treatment?.name ?? '-'}</TableCell>
                      <TableCell className="font-mono">{t.tooth_fdi ?? '-'}</TableCell>
                      <TableCell><Badge variant={t.status === 'completed' ? 'default' : t.status === 'in_progress' ? 'secondary' : 'outline'}>{treatmentStatusLabel[t.status] ?? t.status}</Badge></TableCell>
                      <TableCell>{t.agreed_price !== null ? `S/ ${Number(t.agreed_price).toFixed(2)}` : '-'}</TableCell>
                      {canEditHistory && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => openTreatmentDialog(t)}>Editar</Button>
                            <Button variant="destructive" size="sm" onClick={() => setConfirmDeleteTreatment(t.id)}>Eliminar</Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'odontogram' && (
        <Card>
          <CardHeader><CardTitle>Odontograma</CardTitle></CardHeader>
          <CardContent>
            {canEditHistory && <p className="text-sm text-muted-foreground mb-4">Haz clic en un diente para editar su estado</p>}
            <OdontogramComponent
              data={teethData}
              onUpdate={(fdiCode, data) => {
                updateTooth.mutate({ fdi: fdiCode, status: data.status ?? 'sano', notes: data.notes ?? '' })
              }}
              readOnly={!canEditHistory}
            />
          </CardContent>
        </Card>
      )}

      {/* Record Dialog */}
      <Dialog open={recordDialog} onOpenChange={setRecordDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRecord ? 'Editar registro' : 'Nuevo registro'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Doctor</Label>
              <select value={recordForm.doctor_id} onChange={e => setRecordForm(f => ({ ...f, doctor_id: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Sin doctor</option>
                {(doctorsList as any)?.data?.map((d: any) => <option key={d.id} value={d.id}>{d.first_name} {d.first_last_name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={recordForm.record_date} onChange={e => setRecordForm(f => ({ ...f, record_date: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Motivo</Label><Input value={recordForm.reason} onChange={e => setRecordForm(f => ({ ...f, reason: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Diagnóstico</Label><Input value={recordForm.diagnosis} onChange={e => setRecordForm(f => ({ ...f, diagnosis: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Notas</Label><Input value={recordForm.notes} onChange={e => setRecordForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveRecord}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Treatment Dialog */}
      <Dialog open={treatmentDialog} onOpenChange={setTreatmentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTreatment ? 'Editar tratamiento' : 'Nuevo tratamiento'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Tratamiento</Label>
              <select value={treatmentForm.treatment_id} onChange={e => setTreatmentForm(f => ({ ...f, treatment_id: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Seleccionar...</option>
                {(treatmentsList as any)?.map?.((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Doctor</Label>
              <select value={treatmentForm.doctor_id} onChange={e => setTreatmentForm(f => ({ ...f, doctor_id: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Sin doctor</option>
                {(doctorsList as any)?.data?.map((d: any) => <option key={d.id} value={d.id}>{d.first_name} {d.first_last_name}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Estado</Label>
              <select value={treatmentForm.status} onChange={e => setTreatmentForm(f => ({ ...f, status: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="pending">Pendiente</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="space-y-1"><Label>Precio acordado</Label><Input value={treatmentForm.agreed_price} onChange={e => setTreatmentForm(f => ({ ...f, agreed_price: e.target.value }))} placeholder="S/ 0.00" /></div>
            <div className="space-y-1"><Label>Diente (FDI)</Label><Input value={treatmentForm.tooth_fdi} onChange={e => setTreatmentForm(f => ({ ...f, tooth_fdi: e.target.value }))} placeholder="ej. 11, 16, 24" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTreatmentDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTreatment}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tooth Dialog */}
      <Dialog open={toothDialog} onOpenChange={setToothDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Diente {selectedTooth}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Estado</Label>
              <select value={toothForm.status} onChange={e => setToothForm(f => ({ ...f, status: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="sano">Sano</option>
                <option value="caries">Caries</option>
                <option value="ausente">Ausente</option>
                <option value="implante">Implante</option>
                <option value="corona">Corona</option>
                <option value="endodoncia">Endodoncia</option>
                <option value="extraccion">Extracción</option>
                <option value="puente">Puente</option>
                <option value="protesis">Prótesis</option>
              </select>
            </div>
            <div className="space-y-1"><Label>Notas</Label><Input value={toothForm.notes} onChange={e => setToothForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToothDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTooth}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDeleteRecord}
        onOpenChange={(o) => !o && setConfirmDeleteRecord(null)}
        title="Eliminar registro"
        description="¿Estás seguro de eliminar este registro clínico?"
        onConfirm={() => confirmDeleteRecord && deleteRecord.mutate(confirmDeleteRecord)}
      />

      <ConfirmDialog
        open={!!confirmDeleteTreatment}
        onOpenChange={(o) => !o && setConfirmDeleteTreatment(null)}
        title="Eliminar tratamiento"
        description="¿Estás seguro de eliminar este tratamiento?"
        onConfirm={() => confirmDeleteTreatment && deleteTreatment.mutate(confirmDeleteTreatment)}
      />
    </div>
  )
}
