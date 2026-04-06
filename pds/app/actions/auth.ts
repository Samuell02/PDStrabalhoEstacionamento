'use server'

import { createClient } from '@/lib/supabase/server'

export async function signup(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const errors: any = {}

  if (!name) errors.name = 'Nome é obrigatório'
  if (!email) errors.email = 'Email é obrigatório'
  if (!password || password.length < 6) {
    errors.password = ['Password must be at least 6 characters']
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (error) {
    return {
      errors: {
        email: error.message,
      },
    }
  }

  return {
    success: true,
    message: 'Check your email to confirm your account',
  }
}

export async function login(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const errors: any = {}

  if (!email) errors.email = 'Email é obrigatório'
  if (!password) errors.password = 'Senha é obrigatória'

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

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

  return { success: true }
}