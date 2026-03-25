'use client'
 
import { signup } from '@/app/actions/auth'
import { useActionState } from 'react'
 
export default function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined)
 
  return (
    <form action={action}>
      <div className="flex flex-col">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" placeholder="Name" className="border p-2" />
      </div>
      {state?.errors?.name && <p>{state.errors.name}</p>}
 
      <div className="flex flex-col">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" placeholder="Email" className="border p-2" />
      </div>
      {state?.errors?.email && <p>{state.errors.email}</p>}
 
      <div className="flex flex-col">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" className="border p-2" />
      </div>
      {state?.errors?.password && (
        <div>
          <p>Password must:</p>
          <ul>
            {state.errors.password.map((error) => (
              <li key={error}>- {error}</li>
            ))}
          </ul>
        </div>
      )}
      <button disabled={pending} type="submit">
        Sign Up
      </button>
    </form>
  )
}