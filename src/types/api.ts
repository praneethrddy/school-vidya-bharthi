export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}
