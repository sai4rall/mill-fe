import { useState } from 'react'
import { Button } from '@heroui/react'
import { ArrowRight, Leaf, ShieldCheck, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/context/AuthContext'
import { ErrorAlert } from '../kit/display'
import { PasswordInput, TextInput } from '../kit/fields'
import { BrandMark } from '../shell/nav'
import { v4HomeFor } from '../lib/paths'

const FEATURES = [
  { icon: ShieldCheck, text: 'OTP-verified farmers and payments' },
  { icon: Leaf, text: 'Moisture-based fair pricing' },
  { icon: Truck, text: 'Live trucks, stock and exports' },
]

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(form.username.trim(), form.password)
      navigate(v4HomeFor(data.role))
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="v4-root flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="hidden lg:block">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent" />Rice Mill Management
          </p>
          <h1 className="text-5xl leading-tight font-bold tracking-tight">From paddy to export, all in one place.</h1>
          <ul className="mt-10 grid gap-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-muted">
                <span className="flex size-9 items-center justify-center rounded-field bg-accent-soft text-accent-soft-foreground"><Icon className="size-4" /></span>{text}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} noValidate className="mx-auto grid w-full max-w-md gap-5 rounded-sheet border border-border bg-surface p-7 shadow-e2 sm:p-9">
          <div className="grid gap-4">
            <div className="flex size-12 items-center justify-center rounded-card bg-accent text-accent-foreground"><BrandMark className="size-6" /></div>
            <div><h2 className="text-2xl font-bold tracking-tight">Welcome back</h2><p className="mt-1 text-sm text-muted">Sign in to manage your mill.</p></div>
          </div>
          <TextInput label="Username" autoComplete="username" autoFocus value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} />
          <PasswordInput label="Password" autoComplete="current-password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
          {error && <ErrorAlert>{error}</ErrorAlert>}
          <Button type="submit" size="lg" fullWidth isPending={loading}>Sign in<ArrowRight className="size-4" /></Button>
          <p className="text-center text-xs text-muted">Prefer the old look? <a href="/login" className="font-semibold text-accent hover:underline">Use the classic view</a></p>
        </form>
      </div>
    </div>
  )
}
