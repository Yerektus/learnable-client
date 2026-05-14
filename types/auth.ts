export type User = {
  id: string
  email: string
  username: string
  first_name: string | null
  last_name: string | null
  role: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

export type TokenResponse = {
  access_token: string
  token_type: "bearer"
  // refresh_token is now stored in an httpOnly cookie — never sent to JavaScript
}

export type LoginCredentials = {
  login: string
  password: string
}

export type RegisterCredentials = {
  email: string
  username: string
  password: string
}
