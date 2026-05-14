import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import { useAuthStore } from "@/lib/stores/auth-store"
import type { TokenResponse } from "@/types/auth"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CORE_API_URL ?? "http://localhost:8000"

type RetryRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

export const coreApi = axios.create({
  baseURL: API_BASE_URL,
  // Required so the browser sends the httpOnly refresh_token cookie
  // cross-origin (backend must have allow_credentials=True and explicit origin)
  withCredentials: true,
})

coreApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

coreApi.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      throw error
    }

    originalRequest._retry = true

    try {
      // The httpOnly refresh_token cookie is sent automatically by the browser.
      // No body needed — the server reads the cookie.
      const { data } = await axios.post<TokenResponse>(
        `${API_BASE_URL}/api/v1/auth/jwt/refresh`,
        undefined,
        { withCredentials: true },
      )

      useAuthStore.getState().setTokens(data)
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`

      return coreApi(originalRequest)
    } catch (refreshError) {
      useAuthStore.getState().clearAuth()
      throw refreshError
    }
  },
)
