export type ToothStatus =
  | 'sano'
  | 'caries'
  | 'ausente'
  | 'implante'
  | 'corona'
  | 'endodoncia'
  | 'extraccion'
  | 'puente'
  | 'protesis'

export interface ToothData {
  fdi_code: string
  status: ToothStatus
  notes?: string | null
  updated_at?: string
}

export interface OdontogramData {
  teeth: ToothData[]
}
