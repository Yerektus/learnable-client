"use client"

import { useMutation } from "@tanstack/react-query"
import { Loader2, LogIn, UserPlus } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { useForm } from "react-hook-form"

import {
  login,
  getApiErrorMessage,
  getCurrentUser,
  registerAccount,
} from "@/lib/api/auth"
import { useAuthStore } from "@/lib/stores/auth-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type AuthMode = "login" | "register"

type AuthFormValues = {
  login: string
  email: string
  username: string
  password: string
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = React.useState<AuthMode>("login")
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const user = useAuthStore((state) => state.user)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuthFormValues>({
    defaultValues: {
      login: "",
      email: "",
      username: "",
      password: "",
    },
    mode: "onBlur",
  })

  const mutation = useMutation({
    mutationFn: async (values: AuthFormValues) => {
      clearAuth()
      const password = values.password
      const loginValue =
        mode === "register"
          ? values.username.trim().toLowerCase()
          : values.login.trim()

      if (mode === "register") {
        await registerAccount({
          email: values.email.trim().toLowerCase(),
          username: loginValue,
          password,
        })
      }

      const tokens = await login({ login: loginValue, password })
      setTokens(tokens)

      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)

        return currentUser
      } catch (error) {
        clearAuth()
        throw error
      }
    },
    onSuccess: () => {
      router.replace(searchParams.get("next") ?? "/dashboard")
    },
  })

  const errorMessage = mutation.isError
    ? getApiErrorMessage(mutation.error)
    : null
  const isRegister = mode === "register"

  function switchMode(nextMode: AuthMode) {
    mutation.reset()
    reset({
      login: "",
      email: "",
      username: "",
      password: "",
    })
    setMode(nextMode)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isRegister ? "Create your account" : "Login to your account"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "Choose a username and password to create your account"
              : "Enter your email to access your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))}>
            <FieldGroup>
              {isRegister ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                      id="username"
                      type="text"
                      placeholder="your_username"
                      autoComplete="username"
                      disabled={mutation.isPending}
                      aria-invalid={Boolean(errors.username)}
                      {...register("username", {
                        required: "Username is required.",
                        minLength: {
                          value: 3,
                          message: "Username must be at least 3 characters.",
                        },
                        maxLength: {
                          value: 30,
                          message: "Username must be 30 characters or less.",
                        },
                        pattern: {
                          value: USERNAME_PATTERN,
                          message:
                            "Use only letters, numbers, and underscores.",
                        },
                      })}
                    />
                    {errors.username?.message ? (
                      <FieldError>{errors.username.message}</FieldError>
                    ) : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      autoComplete="email"
                      disabled={mutation.isPending}
                      aria-invalid={Boolean(errors.email)}
                      {...register("email", {
                        required: "Email is required.",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Enter a valid email address.",
                        },
                      })}
                    />
                    {errors.email?.message ? (
                      <FieldError>{errors.email.message}</FieldError>
                    ) : null}
                  </Field>
                </>
              ) : (
                <Field>
                  <FieldLabel htmlFor="login">Email</FieldLabel>
                  <Input
                    id="login"
                    type="email"
                    placeholder="m@example.com"
                    autoComplete="email"
                    disabled={mutation.isPending}
                    aria-invalid={Boolean(errors.login)}
                    {...register("login", {
                      required: "Email is required.",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Enter a valid email address.",
                      },
                    })}
                  />
                  {errors.login?.message ? (
                    <FieldError>{errors.login.message}</FieldError>
                  ) : null}
                </Field>
              )}
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  {!isRegister ? (
                    <a
                      href="#"
                      className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  ) : null}
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    isRegister ? "new-password" : "current-password"
                  }
                  disabled={mutation.isPending}
                  aria-invalid={Boolean(errors.password)}
                  {...register("password", {
                    required: "Password is required.",
                    minLength: isRegister
                      ? {
                          value: 8,
                          message: "Password must be at least 8 characters.",
                        }
                      : undefined,
                  })}
                />
                {errors.password?.message ? (
                  <FieldError>{errors.password.message}</FieldError>
                ) : null}
              </Field>
              {errorMessage ? <FieldError>{errorMessage}</FieldError> : null}
              {user ? (
                <FieldDescription>Signed in as {user.email}</FieldDescription>
              ) : null}
              <Field>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full"
                >
                  {mutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : isRegister ? (
                    <UserPlus />
                  ) : null}
                  {isRegister ? "Create account" : "Login"}
                </Button>
                {!isRegister ? (
                  <Button variant="outline" type="button" className="w-full">
                    <LogIn />
                    Login with Google
                  </Button>
                ) : null}
                <FieldDescription className="text-center">
                  {isRegister
                    ? "Already have an account?"
                    : "Don't have an account?"}{" "}
                  <button
                    type="button"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    onClick={() =>
                      switchMode(isRegister ? "login" : "register")
                    }
                  >
                    {isRegister ? "Login" : "Sign up"}
                  </button>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
