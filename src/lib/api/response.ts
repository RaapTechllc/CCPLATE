import { NextResponse } from "next/server"

export type PaginationMeta = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ApiResponse<T = unknown> = {
  success: true
  data: T
  meta?: PaginationMeta
} | {
  success: false
  error: {
    code: string
    message: string
  }
}

export function successResponse<T>(data: T, meta?: PaginationMeta, status = 200) {
  const response: { success: true; data: T; meta?: PaginationMeta } = {
    success: true,
    data
  }

  if (meta) {
    response.meta = meta
  }

  return NextResponse.json(response, { status })
}

export function errorResponse(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  )
}
