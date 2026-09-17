/** Shared Pagination Request Parameters (AGENTS.md Rule 3: Hoisted Types) */
export interface PaginationParams {
  page?: number
  limit?: number
}

/** Shared Paginated Response Wrapper */
export interface PaginatedResponse<T> {
  items: T[]
  hasMore: boolean
  total: number
}
