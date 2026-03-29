'use server'

import {
  SignupFormSchema,
  LoginFormSchema,
  FormState,
  LoginFormState,
} from '@/app/lib/definitions'
import { createClient } from '@/app/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signup(state: FormState, formData: FormData) {
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { name, email, password } = validatedFields.data
  const supabase = await createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      ...(siteUrl
        ? { emailRedirectTo: `${siteUrl.replace(/\/$/, '')}/auth/callback` }
        : {}),
    },
  })

  if (error) {
    return {
      message: error.message,
    }
  }

  redirect('/login')
}

export async function login(state: LoginFormState, formData: FormData) {
  const validatedFields = LoginFormSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    const fieldErrors = validatedFields.error.flatten().fieldErrors
    return {
      errors: {
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
      },
    }
  }

  const { email, password } = validatedFields.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      errors: {
        submit: error.message,
      },
    }
  }

  redirect('/')
}
