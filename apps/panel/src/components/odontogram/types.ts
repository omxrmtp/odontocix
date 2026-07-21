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
  fdiCode: string
  status: ToothStatus
  surface?: string
  treatmentId?: number
  notes?: string
}

export interface OdontogramData {
  [fdiCode: string]: ToothData
}

export type QuadrantSection = 'upper-right' | 'upper-left' | 'lower-left' | 'lower-right'

export interface QuadrantConfig {
  label: string
  codes: string[]
  section: QuadrantSection
  prefix: string
}
