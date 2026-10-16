import axios, { AxiosError } from "axios"

import { useAuthStore } from "@/stores/auth"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  headers: { Accept: "application/json" },
  timeout: 20_000,
})

if (import.meta.env.VITE_USE_MOCKS === "true") {
  const { mockAdapter } = await import("@/mocks/adapter")
  api.defaults.adapter = mockAdapter
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) useAuthStore.getState().signOut()
    return Promise.reject(toApiError(error))
  }
)

/** A DRF error flattened into something a form or toast can show. */
export class ApiError extends Error {
  status: number | null
  fieldErrors: Record<string, string[]>

  constructor(message: string, status: number | null, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function toApiError(error: AxiosError): ApiError {
  const status = error.response?.status ?? null
  const data = error.response?.data
  if (!error.response) return new ApiError("Can't reach SchoolShop. Check your connection.", null)
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>
    if (typeof body.detail === "string") return new ApiError(body.detail, status)
    const fieldErrors: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(body)) {
      if (Array.isArray(value)) fieldErrors[key] = value.map(String)
    }
    const first = fieldErrors.nonFieldErrors?.[0] ?? Object.values(fieldErrors)[0]?.[0]
    return new ApiError(first ?? "Something went wrong.", status, fieldErrors)
  }
  return new ApiError("Something went wrong.", status)
}
