import axios, { AxiosError } from "axios"

import { coreApi } from "@/lib/api/client"
import type {
  LoginCredentials,
  RegisterCredentials,
  TokenResponse,
  User,
} from "@/types/auth"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_CORE_API_URL ?? "http://localhost:8000"

export async function login(credentials: LoginCredentials) {
  const formData = new URLSearchParams()
  formData.set("username", credentials.login)
  formData.set("password", credentials.password)

  const { data: tokens } = await coreApi.post<TokenResponse>(
    "/api/v1/auth/jwt/login",
    formData,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  )

  return tokens
}

/** Attempt to get a new access token using the httpOnly refresh cookie.
 *  Returns the access_token string on success, null if the cookie is absent or expired. */
export async function silentRefresh(): Promise<string | null> {
  try {
    const { data } = await axios.post<TokenResponse>(
      `${API_BASE_URL}/api/v1/auth/jwt/refresh`,
      undefined,
      { withCredentials: true },
    )
    return data.access_token
  } catch {
    return null
  }
}

/** Call the backend logout endpoint to clear the httpOnly refresh cookie. */
export async function logout(): Promise<void> {
  try {
    await coreApi.post("/api/v1/auth/jwt/logout")
  } catch {
    // ignore — cookie will expire naturally
  }
}

export async function registerAccount(credentials: RegisterCredentials) {
  const { data } = await coreApi.post<User>(
    "/api/v1/auth/register",
    credentials
  )

  return data
}

export async function getCurrentUser() {
  const { data } = await coreApi.get<User>("/api/v1/users/me")

  return data
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail

    if (typeof detail === "string") {
      if (detail === "LOGIN_BAD_CREDENTIALS") {
        return "Invalid login or password."
      }

      return detail
    }

    if (detail && typeof detail === "object" && "message" in detail) {
      return String(detail.message)
    }

    const field = error.response?.data?.field
    if (field === "username") {
      return "Login is already taken."
    }

    if (field === "email") {
      return "Email is already registered."
    }
  }

  return "Something went wrong. Please try again."
}
