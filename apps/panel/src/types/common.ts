export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  prev?: number | null
  next?: number | null
}
