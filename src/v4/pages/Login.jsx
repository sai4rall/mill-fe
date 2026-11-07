import { useState } from 'react'
import { Button } from '@heroui/react'
import { ArrowRight, Leaf, ShieldCheck, Truck } from 'lucide-react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/context/AuthContext'
import { ErrorAlert } from '../kit/display'
import { PasswordInput, TextInput } from '../kit/fields'
import { BrandMark } from '../shell/nav'
import { ease } from '../lib/motion'
import { v4HomeFor } from '../lib/paths'

const BLOBS = [
  { className: 'left-[-10%] top-[-10%] size-[42rem] bg-emerald-300/50', x: [0, 60, 0], y: [0, 40, 0] },
  { className: 'right-[-15%] top-[10%] size-[36rem] bg-lime-200/60', x: [0, -50, 0], y: [0, 60, 0] },
  { className: 'bottom-[-20%] left-[20%] size-[40rem] bg-teal-200/50', x: [0, 40, 0], y: [0, -50, 0] },
]
const FEATURES = [
  { icon: ShieldCheck, text: 'OTP-verified farmers & payments' },
  { icon: Leaf, text: 'Moisture-based fair pricing' },
  { icon: Truck, text: 'Live trucks, stock & exports' },
]
const words = 'From paddy to export, all in one place.'.split(' ')

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
    <div className="v4-root relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      {BLOBS.map((b, i) => (
        <motion.div key={i} aria-hidden className={`pointer-events-none absolute rounded-full blur-3xl ${b.className}`}
          animate={{ x: b.x, y: b.y }} transition={{ duration: 18 + i * 4, repeat: Infinity, ease: 'easeInOut' }} />
      ))}

      <div className="relative grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="hidden lg:block">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-600/15 bg-white/60 px-3 py-1 text-xs font-semibold text-emerald-800 backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />Rice Mill Management
          </motion.div>
          <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight text-emerald-950">
            {words.map((w, i) => (
              <motion.span key={i} className="mr-[0.25em] inline-block" initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease }}>{w}</motion.span>
            ))}
          </h1>
          <div className="mt-10 grid gap-3">
            {FEATURES.map(({ icon: Icon, text }, i) => (
              <motion.div key={text} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 + i * 0.12, duration: 0.5, ease }}
                className="flex items-center gap-3 text-emerald-950/80">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/70 text-emerald-700 shadow-sm backdrop-blur"><Icon className="size-4" /></span>{text}
              </motion.div>
            ))}
          </div>
        </div>

        <motion.form onSubmit={submit} noValidate initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.1 }}
          className="v4-glass mx-auto grid w-full max-w-md gap-5 rounded-[2rem] border border-white/70 p-7 shadow-2xl shadow-emerald-900/10 sm:p-9">
          <div className="grid gap-4">
            <motion.div whileHover={{ rotate: -8, scale: 1.05 }} className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-lg shadow-emerald-600/30">
              <BrandMark className="size-6" />
            </motion.div>
            <div><h2 className="text-2xl font-bold tracking-tight">Welcome back</h2><p className="mt-1 text-sm text-muted">Sign in to manage your mill.</p></div>
          </div>
          <TextInput label="Username" autoComplete="username" autoFocus value={form.username} onChange={v => setForm(f => ({ ...f, username: v }))} />
          <PasswordInput label="Password" autoComplete="current-password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} />
          {error && <ErrorAlert>{error}</ErrorAlert>}
          <Button type="submit" size="lg" fullWidth isPending={loading} className="group">
            Sign in<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Button>
          <p className="text-center text-xs text-muted">Prefer the old look? <a href="/login" className="font-semibold text-accent hover:underline">Use the classic view</a></p>
        </motion.form>
      </div>
    </div>
  )
}
