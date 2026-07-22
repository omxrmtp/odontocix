import api, { downloadPdf } from './api'
import type { Role, ModulePermissions, UserWithRoles } from '@/types/rbac'

export const appointmentsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/appointments', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/appointments', data).then(r => r.data),
  show: (id: number) =>
    api.get(`/appointments/${id}`).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/appointments/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/appointments/${id}`).then(r => r.data),
  whatsappLinks: (id: number) =>
    api.get(`/appointments/${id}/whatsapp-links`).then(r => r.data),
  upcomingReminders: () =>
    api.get('/appointments/upcoming-for-reminders').then(r => r.data),
}

export const budgetsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/budgets', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/budgets', data).then(r => r.data),
  show: (id: number) =>
    api.get(`/budgets/${id}`).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/budgets/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/budgets/${id}`).then(r => r.data),
}

export const paymentsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/payments', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/payments', data).then(r => r.data),
  show: (id: number) =>
    api.get(`/payments/${id}`).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/payments/${id}`).then(r => r.data),
  budgetBalance: (budgetId: number) =>
    api.get(`/budgets/${budgetId}/balance`).then(r => r.data),
}

export const cashApi = {
  list: (params?: Record<string, string>) =>
    api.get('/cash', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/cash', data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/cash/${id}`).then(r => r.data),
  summary: (params?: Record<string, string>) =>
    api.get('/cash/summary', { params }).then(r => r.data),
}

export const patientsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/patients', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/patients', data).then(r => r.data),
  show: (id: number) =>
    api.get(`/patients/${id}`).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/patients/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/patients/${id}`).then(r => r.data),
  lookup: (dni: string) =>
    api.get('/reniec/lookup', { params: { dni } }).then(r => r.data),
  history: (id: number) =>
    api.get(`/patients/${id}/history`).then(r => r.data),
}

export const doctorsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/doctors', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/doctors', data).then(r => r.data),
  show: (id: number) =>
    api.get(`/doctors/${id}`).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/doctors/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/doctors/${id}`).then(r => r.data),
}

export const treatmentsApi = {
  list: () =>
    api.get('/treatments').then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/treatments', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/treatments/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/treatments/${id}`).then(r => r.data),
}

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then(r => r.data),
  charts: () => api.get('/dashboard/charts').then(r => r.data),
}

export const profileApi = {
  show: () => api.get('/profile').then(r => r.data),
  update: (data: { name?: string; email?: string }) => api.put('/profile', data).then(r => r.data),
  password: (data: { current_password: string; password: string; password_confirmation: string }) => api.put('/profile/password', data).then(r => r.data),
  tenant: () => api.get('/tenant').then(r => r.data),
  updateTenant: (data: Record<string, unknown>) => api.put('/tenant', data).then(r => r.data),
}

export function downloadBudgetPdf(id: number): Promise<Blob> {
  return downloadPdf(`/pdf/budgets/${id}`)
}

export function downloadPaymentReceipt(id: number): Promise<Blob> {
  return downloadPdf(`/pdf/payments/${id}/receipt`)
}

export function downloadPatientHistory(id: number): Promise<Blob> {
  return downloadPdf(`/pdf/patients/${id}/history`)
}

export const portalApi = {
  patient: (token: string) =>
    api.get(`/portal/patient/${token}`).then(r => r.data),
  appointments: (token: string) =>
    api.get(`/portal/patient/${token}/appointments`).then(r => r.data),
  history: (token: string) =>
    api.get(`/portal/patient/${token}/history`).then(r => r.data),
  budgets: (token: string) =>
    api.get(`/portal/patient/${token}/budgets`).then(r => r.data),
}

export function downloadPortalHistoryPdf(token: string): Promise<Blob> {
  return downloadPdf(`/portal/patient/${token}/history/pdf`)
}

export const recordsApi = {
  create: (patientId: number, data: Record<string, unknown>) =>
    api.post(`/patients/${patientId}/records`, data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/records/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/records/${id}`).then(r => r.data),
}

export const odontogramApi = {
  update: (patientId: number, fdiCode: string, data: Record<string, unknown>) =>
    api.put(`/patients/${patientId}/odontogram/${fdiCode}`, data).then(r => r.data),
}

export const patientTreatmentsApi = {
  create: (patientId: number, data: Record<string, unknown>) =>
    api.post(`/patients/${patientId}/treatments`, data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/patient-treatments/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/patient-treatments/${id}`).then(r => r.data),
}

export const consentFormsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/consent-forms', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/consent-forms', data).then(r => r.data),
  show: (id: number) =>
    api.get(`/consent-forms/${id}`).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/consent-forms/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/consent-forms/${id}`).then(r => r.data),
  sign: (id: number, data: Record<string, unknown>) =>
    api.post(`/consent-forms/${id}/sign`, data).then(r => r.data),
}

export const consentTemplatesApi = {
  list: (params?: Record<string, string>) =>
    api.get('/consent-templates', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/consent-templates', data).then(r => r.data),
  show: (id: number) =>
    api.get(`/consent-templates/${id}`).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/consent-templates/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/consent-templates/${id}`).then(r => r.data),
}

export function downloadConsentFormPdf(id: number): Promise<Blob> {
  return downloadPdf(`/pdf/consent-forms/${id}`)
}

export const inventoryApi = {
  list: (params?: Record<string, string>) =>
    api.get('/inventory', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/inventory', data).then(r => r.data),
  show: (id: number) =>
    api.get(`/inventory/${id}`).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/inventory/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/inventory/${id}`).then(r => r.data),
  movement: (id: number, data: Record<string, unknown>) =>
    api.post(`/inventory/${id}/movement`, data).then(r => r.data),
  lowStock: () =>
    api.get('/inventory/low-stock').then(r => r.data),
}

export const availableSlotsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/available-slots', { params }).then(r => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/available-slots', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/available-slots/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    api.delete(`/available-slots/${id}`).then(r => r.data),
}

export const onlineBookingApi = {
  doctors: (tenantId: string) =>
    api.get('/online-booking/doctors', { params: { tenant_id: tenantId } }).then(r => r.data),
  slots: (params: { doctor_id: string | number; date: string; tenant_id: string }) =>
    api.get('/online-booking/slots', { params }).then(r => r.data),
  book: (data: Record<string, unknown> & { tenant_id: string }) =>
    api.post('/online-booking/appointments', data).then(r => r.data),
}

export const auditLogsApi = {
  list: (params?: Record<string, string>) =>
    api.get('/audit-logs', { params }).then(r => r.data),
}

export const reportsApi = {
  income: (params: Record<string, string>) =>
    api.get('/reports/income', { params }).then(r => r.data),
  treatments: (params: Record<string, string>) =>
    api.get('/reports/treatments', { params }).then(r => r.data),
  doctors: (params: Record<string, string>) =>
    api.get('/reports/doctors', { params }).then(r => r.data),
  patients: (params: Record<string, string>) =>
    api.get('/reports/patients', { params }).then(r => r.data),
}

export const usersApi = {
  list: () => api.get('/users').then(r => r.data as UserWithRoles[]),
  create: (data: Record<string, unknown>) => api.post('/users', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data).then(r => r.data),
  assignRole: (id: number, role: string) => api.put(`/users/${id}/role`, { role }).then(r => r.data),
  toggleActive: (id: number) => api.put(`/users/${id}/toggle-active`).then(r => r.data),
  delete: (id: number) => api.delete(`/users/${id}`).then(r => r.data),
}

export const rolesApi = {
  list: () => api.get('/roles').then(r => r.data as Role[]),
  create: (data: Record<string, unknown>) => api.post('/roles', data).then(r => r.data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/roles/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/roles/${id}`).then(r => r.data),
  permissions: () => api.get('/permissions').then(r => r.data as ModulePermissions[]),
}
