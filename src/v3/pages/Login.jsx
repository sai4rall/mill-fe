import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/v3/ui/button'
import { Input } from '@/v3/ui/input'
import { useAuth } from '../../shared/context/AuthContext'
import ErrorAlert from '../components/ErrorAlert'
import Field from '../components/Field'
import PasswordInput from '../components/PasswordInput'
import { BrandMark } from '../shell/nav'
import { v3HomeFor } from '../lib/paths'

const POINTS = ['Farmer registration with verified mobiles', 'Moisture-based pricing and OTP-confirmed payments', 'Live stock, mill batches and export orders']

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
      navigate(v3HomeFor(data.role))
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-sm"><BrandMark className="size-5" /></div>
          <span className="font-semibold">Mill System</span>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <form onSubmit={submit} className="grid w-full max-w-sm gap-6">
            <div className="grid gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Sign in to manage your mill.</p>
            </div>
            <Field id="username" label="Username">
              <Input id="username" required autoComplete="username" autoFocus value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </Field>
            <Field id="password" label="Password">
              <PasswordInput id="password" label="Password" required autoComplete="current-password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </Field>
            {error && <ErrorAlert>{error}</ErrorAlert>}
            <Button type="submit" size="lg" disabled={loading} className="w-full">{loading && <Loader2 className="animate-spin" />}Sign in</Button>
          </form>
        </div>
        <p className="text-xs text-muted-foreground">Rice Mill Management</p>
      </div>
      <div className="relative hidden overflow-hidden bg-emerald-950 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_100%_0%,rgba(52,211,153,0.45),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgba(16,185,129,0.35),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative flex h-full flex-col justify-end gap-6 p-12 text-white">
          <h2 className="max-w-lg text-4xl leading-tight font-semibold tracking-tight">From paddy to export, all in one place.</h2>
          <ul className="grid gap-3 text-emerald-50/90">
            {POINTS.map(p => <li key={p} className="flex items-center gap-3"><CheckCircle2 className="size-5 text-emerald-300" />{p}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}
