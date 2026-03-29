import { useState, useEffect, useRef } from 'react'

// ─── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  white:   '#FFFFFF',
  black:   '#111111',
  lime:    '#E5F6A1',
  gray:    '#F0F0F0',
  darkBg:  '#161618',
  muted:   '#666666',
  border:  'rgba(0,0,0,0.08)',
  borderStrong: '#111111',
}

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body, #root { height: 100%; background: #fff; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', sans-serif; -webkit-font-smoothing: antialiased; color: #111; overscroll-behavior: none; }
  input, button, textarea { font-family: inherit; }
  input:focus { outline: none; }
  button:disabled { opacity: 0.35; cursor: not-allowed; }
  button:not(:disabled):active { transform: scale(0.97); }
  img { display: block; max-width: 100%; }
  ::-webkit-scrollbar { display: none; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
`

// ─── API ──────────────────────────────────────────────────────────────────────
async function api(endpoint, body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ─── SESSION ──────────────────────────────────────────────────────────────────
const AUTH_KEY = 'stuup_partner_v1'
const saveSession = (s) => localStorage.setItem(AUTH_KEY, JSON.stringify(s))
const loadSession = () => { try { const s = localStorage.getItem(AUTH_KEY); return s ? JSON.parse(s) : null } catch { return null } }
const clearSession = () => localStorage.removeItem(AUTH_KEY)

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const Wordmark = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.black }} />
    <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${C.black}`, background: 'transparent' }} />
  </div>
)

const SectionLabel = ({ children, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 20px', marginBottom: 8 }}>
    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.black }}>{children}</span>
    {right && <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{right}</span>}
  </div>
)

const FieldLabel = ({ children }) => (
  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 5 }}>{children}</div>
)

const InfoCard = ({ children, style: sx = {} }) => (
  <div style={{ background: C.gray, borderRadius: 16, padding: '14px 16px', marginBottom: 12, ...sx }}>{children}</div>
)

const Alert = ({ type = 'error', children }) => {
  const colors = {
    error:   '#c00',
    success: '#1a7a3a',
  }
  return (
    <div style={{ border: `1px solid ${colors[type]}`, borderRadius: 10, padding: '11px 14px', color: colors[type], fontSize: 13, marginBottom: 14, lineHeight: 1.4, background: type === 'success' ? '#f0faf4' : '#fff5f5' }}>
      {children}
    </div>
  )
}

const PillBadge = ({ children, variant = 'outline' }) => {
  const styles = {
    outline: { border: `1px solid ${C.black}`, background: 'transparent', color: C.black },
    dark:    { background: C.darkBg, color: '#fff', border: 'none' },
    lime:    { background: C.lime, color: C.black, border: 'none' },
    red:     { background: C.darkBg, color: '#fff', border: 'none' },
  }
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', ...styles[variant] }}>
      {children}
    </span>
  )
}

const Input = ({ label, value, onChange, type = 'text', placeholder, autoFocus, inputMode }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <FieldLabel>{label}</FieldLabel>}
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} autoFocus={autoFocus} inputMode={inputMode}
      style={{ width: '100%', padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 15, background: C.gray, color: C.black }}
    />
  </div>
)

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
    <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.black, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

// ─── HEADER ───────────────────────────────────────────────────────────────────
const Header = ({ storeName, onLogout }) => (
  <div style={{ padding: '20px 20px 16px', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, flexShrink: 0 }}>
    <Wordmark />
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {storeName && <span style={{ fontSize: 13, fontWeight: 500 }}>Staff Portal</span>}
      {onLogout && (
        <button onClick={onLogout} style={{ width: 32, height: 32, borderRadius: '50%', background: C.gray, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      )}
    </div>
  </div>
)

// ─── ACTION BAR ───────────────────────────────────────────────────────────────
const ActionBar = ({ onScan, onRelease }) => (
  <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '20px 20px 32px', background: 'linear-gradient(to top, #fff 70%, transparent)', zIndex: 100 }}>
    <div style={{ display: 'flex', gap: 10 }}>
      <button onClick={onScan} style={{ flex: 1, background: C.darkBg, color: '#fff', border: 'none', borderRadius: 99, padding: '14px 8px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
        Accept Package
      </button>
      <button onClick={onRelease} style={{ flex: 1, background: C.lime, color: C.black, border: 'none', borderRadius: 99, padding: '14px 8px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.black} strokeWidth="1.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        Release Package
      </button>
    </div>
  </div>
)

const BackLink = ({ onClick }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: C.black, cursor: 'pointer', padding: '0 0 14px', display: 'block' }}>← Back</button>
)

const BtnDark = ({ children, onClick, loading, disabled }) => (
  <button onClick={onClick} disabled={disabled || loading} style={{ display: 'block', width: '100%', padding: '14px', background: C.darkBg, color: '#fff', border: 'none', borderRadius: 99, fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center', marginBottom: 10 }}>
    {loading ? '…' : children}
  </button>
)

const BtnOutline = ({ children, onClick, danger }) => (
  <button onClick={onClick} style={{ display: 'block', width: '100%', padding: '14px', background: 'transparent', color: danger ? '#c00' : C.black, border: `1px solid ${danger ? '#c00' : C.black}`, borderRadius: 99, fontSize: 14, fontWeight: 500, cursor: 'pointer', textAlign: 'center', marginBottom: 10 }}>
    {children}
  </button>
)

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleLogin() {
    setError('')
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    setLoading(true)
    const data = await api('/api/partner-auth', { action: 'login', email: email.trim().toLowerCase(), password })
    setLoading(false)
    if (data.error) { setError(data.error); return }
    saveSession(data.store)
    onLogin(data.store)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', maxWidth: 480, margin: '0 auto', animation: 'fadeIn 0.25s ease' }}>
      <div style={{ marginBottom: 44 }}>
        <Wordmark />
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 4 }}>Staff Portal</div>
      <div style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-0.5px', textTransform: 'uppercase', marginBottom: 4 }}>Sign in</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>Use your email and onboarding password.</div>

      {error && <Alert type="error">{error}</Alert>}
      <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="owner@store.com" autoFocus inputMode="email" />
      <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
      <div style={{ marginTop: 6 }}><BtnDark onClick={handleLogin} loading={loading} disabled={!email || !password}>Sign in</BtnDark></div>
      <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 20 }}>
        Forgot password? Contact <a href="mailto:hello@stuup.co" style={{ color: C.black, fontWeight: 600, textDecoration: 'none' }}>hello@stuup.co</a>
      </div>
    </div>
  )
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ store, onScan, onRelease }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  async function load() {
    setLoading(true); setError('')
    const res = await api('/api/partner-data', { action: 'get-home', storeId: store.id })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setData(res)
  }

  useEffect(() => { load() }, [])

  const fmtTime = iso => {
    if (!iso) return '—'
    const d = new Date(iso)
    const now = new Date()
    const hrs = Math.round((now - d) / 3600000)
    if (hrs < 1) return 'Just now'
    if (hrs < 24) return `${hrs}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const statusVariant = s => s === 'Code Issued' ? 'lime' : s === 'Waiting' ? 'outline' : 'dark'

  return (
    <div style={{ paddingBottom: 120, animation: 'fadeIn 0.25s ease' }}>
      {/* Store title */}
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ fontSize: 36, fontWeight: 300, letterSpacing: '-1px', textTransform: 'uppercase', lineHeight: 1.05, marginBottom: 4 }}>
          {store.name.split(' ').slice(0, 2).join('\n').split('\n').map((w, i) => <span key={i}>{w}<br /></span>)}
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · Active Shift
        </div>
      </div>

      {loading && <Spinner />}
      {error && <div style={{ padding: '0 20px' }}><Alert type="error">{error}</Alert></div>}

      {data && <>
        {/* Big lime card */}
        <div style={{ margin: '0 20px 10px', background: C.lime, borderRadius: 24, padding: '20px 22px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <span style={{ display: 'inline-block', padding: '6px 14px', background: C.darkBg, color: '#fff', borderRadius: 99, fontSize: 12, fontWeight: 500 }}>Inventory Total</span>
            <span style={{ fontSize: 20, fontWeight: 300 }}>↗</span>
          </div>
          <div style={{ fontSize: 60, fontWeight: 300, letterSpacing: '-2px', lineHeight: 1, marginBottom: 4, color: C.black }}>{data.store.currentPackageCount || 0}</div>
          <div style={{ fontSize: 12, color: '#555' }}>Packages currently held</div>
        </div>

        {/* 2-col stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '0 20px 20px' }}>
          <div style={{ background: C.gray, borderRadius: 24, padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 130 }}>
            <div style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 8 }}>{data.todayCount}</div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, lineHeight: 1.3 }}>Received<br />Today</div>
          </div>
          <div style={{ background: C.darkBg, color: '#fff', borderRadius: 24, padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 130 }}>
            <div style={{ fontSize: 44, fontWeight: 300, letterSpacing: '-1.5px', lineHeight: 1, marginBottom: 8 }}>
              {(data.packages || []).filter(p => p.status === 'Collected').length}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7, lineHeight: 1.3 }}>Released<br />Today</div>
          </div>
        </div>

        {/* Package list */}
        <SectionLabel right="RECENT">Ready for Pickup</SectionLabel>

        {data.packages.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: C.muted, fontSize: 13 }}>No active packages right now.</div>
        )}

        {data.packages.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < data.packages.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: p.status === 'Code Issued' ? 'transparent' : C.gray, border: p.status === 'Code Issued' ? `1px solid ${C.black}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.black} strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.recipientName || '—'}</div>
              <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>#{p.carrier?.toUpperCase() || 'PKG'}-{(p.trackingNumber || '').slice(-4)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <PillBadge variant={statusVariant(p.status)}>{p.status}</PillBadge>
              <span style={{ fontSize: 10, color: C.muted }}>{fmtTime(p.arrivedAt)}</span>
            </div>
          </div>
        ))}
      </>}

      <ActionBar onScan={onScan} onRelease={onRelease} />
    </div>
  )
}

// ─── SCAN ─────────────────────────────────────────────────────────────────────
function ScanScreen({ store, onBack, onDone }) {
  const [step, setStep]       = useState('capture')
  const [preview, setPreview] = useState(null)
  const [b64, setB64]         = useState(null)
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState(null)
  const [condition, setCond]  = useState('Intact')
  const [condNote, setNote]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const fileRef = useRef()

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => { setPreview(e.target.result); setB64(e.target.result.split(',')[1]) }
    reader.readAsDataURL(file)
  }

  async function handleSend() {
    setError(''); setSending(true)
    try {
      const bytes = atob(b64); const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      const blob = new Blob([arr], { type: 'image/jpeg' })
      const fd = new FormData()
      fd.append('image', blob, 'label.jpg')
      fd.append('store_id', store.id)
      fd.append('store_name', store.name)
      await fetch('https://hooks.zapier.com/hooks/catch/26882614/un3peri/', { method: 'POST', body: fd })
    } catch (_) {}
    setSending(false); setStep('confirming')
    let tries = 0
    const interval = setInterval(async () => {
      tries++
      const res = await api('/api/partner-data', { action: 'get-pending-confirmation', storeId: store.id })
      if (res.package) { clearInterval(interval); setPending(res.package); setStep('condition') }
      if (tries > 20) { clearInterval(interval); setError('Package not found after 60s. Check Airtable.'); setStep('capture') }
    }, 3000)
  }

  async function handleConfirm() {
    setSaving(true)
    const res = await api('/api/partner-data', { action: 'confirm-package', storeId: store.id, packageId: pending.id, condition, conditionNote: condNote })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setStep('done')
  }

  async function handleReject() {
    setSaving(true)
    await api('/api/partner-data', { action: 'reject-package', storeId: store.id, packageId: pending.id })
    setSaving(false); reset()
  }

  function reset() { setStep('capture'); setPreview(null); setB64(null); setPending(null); setCond('Intact'); setNote(''); setError('') }

  if (step === 'done') return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.25s ease', paddingBottom: 40 }}>
      <div style={{ fontSize: 30, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 20 }}>Logged ✓</div>
      <Alert type="success">Package recorded. Customer has been notified.</Alert>
      <InfoCard>
        <div style={{ fontWeight: 500 }}>{pending?.recipientName || '—'}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3, fontFamily: 'monospace' }}>{pending?.carrier} · {pending?.trackingNumber}</div>
      </InfoCard>
      <BtnDark onClick={() => { reset(); onDone && onDone() }}>Back to home</BtnDark>
      <BtnOutline onClick={reset}>Scan another</BtnOutline>
    </div>
  )

  if (step === 'confirming') return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <div style={{ fontSize: 30, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 40 }}>Reading<br />Label…</div>
      <Spinner />
      <div style={{ color: C.muted, fontSize: 13, marginTop: 8 }}>Claude is extracting the name and tracking number.<br />Takes about 10 seconds.</div>
    </div>
  )

  if (step === 'condition') return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.25s ease', paddingBottom: 40 }}>
      <BackLink onClick={reset} />
      <div style={{ fontSize: 28, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 4 }}>Confirm<br />Package</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>For {pending?.recipientName || '—'}</div>
      {error && <Alert type="error">{error}</Alert>}
      <InfoCard>
        <FieldLabel>Recipient on label</FieldLabel>
        <div style={{ fontSize: 16, fontWeight: 500 }}>{pending?.recipientName || '—'}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4, fontFamily: 'monospace' }}>{pending?.carrier} · {pending?.trackingNumber}</div>
      </InfoCard>
      {pending?.labelPhoto && (
        <InfoCard><FieldLabel>Label</FieldLabel><img src={pending.labelPhoto} alt="label" style={{ borderRadius: 8, width: '100%' }} /></InfoCard>
      )}
      <FieldLabel>Package condition</FieldLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
        {['Intact', 'Damaged Packaging', 'Partially Open', 'Cannot Assess'].map(c => (
          <button key={c} onClick={() => setCond(c)} style={{ padding: '11px 14px', borderRadius: 10, border: `1px solid ${condition === c ? C.black : C.border}`, background: condition === c ? C.gray : C.white, fontSize: 13, fontWeight: condition === c ? 600 : 400, cursor: 'pointer', textAlign: 'left', color: C.black }}>
            {c}
          </button>
        ))}
      </div>
      {condition !== 'Intact' && <Input label="Condition note" value={condNote} onChange={setNote} placeholder="Describe the issue..." />}
      <BtnDark onClick={handleConfirm} loading={saving}>Confirm & notify customer</BtnDark>
      <BtnOutline onClick={handleReject} danger>Not a Stuup package — delete</BtnOutline>
    </div>
  )

  return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.25s ease', paddingBottom: 40 }}>
      <BackLink onClick={onBack} />
      <div style={{ fontSize: 28, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 4 }}>Scan<br />Package</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Take a clear photo of the full shipping label.</div>
      {error && <Alert type="error">{error}</Alert>}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
      {!preview
        ? <button onClick={() => fileRef.current.click()} style={{ width: '100%', aspectRatio: '4/3', background: C.gray, border: `1.5px dashed #ccc`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', color: C.muted }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/></svg>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Tap to open camera</span>
            <span style={{ fontSize: 12 }}>Fill the frame with the full label</span>
          </button>
        : <>
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
              <img src={preview} alt="preview" style={{ width: '100%' }} />
              <button onClick={() => { setPreview(null); setB64(null) }} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <BtnDark onClick={handleSend} loading={sending}>Send to Stuup</BtnDark>
            <BtnOutline onClick={() => fileRef.current.click()}>Retake photo</BtnOutline>
          </>
      }
    </div>
  )
}

// ─── RELEASE ──────────────────────────────────────────────────────────────────
function ReleaseScreen({ store, onBack, onDone }) {
  const [step, setStep]       = useState('code')
  const [code, setCode]       = useState('')
  const [pkg, setPkg]         = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [hPreview, setHP]     = useState(null)
  const [hB64, setHB]         = useState(null)
  const [releasing, setRel]   = useState(false)
  const fileRef = useRef()

  async function lookup() {
    const n = parseInt(code)
    if (!n || code.length !== 6) { setError('Enter a valid 6-digit code.'); return }
    setError(''); setLoading(true)
    const res = await api('/api/partner-data', { action: 'lookup-code', storeId: store.id, code: n })
    setLoading(false)
    if (res.expired) { setError('This code has expired. The customer needs to request a new one.'); return }
    if (!res.package) { setError('Code not found. Double-check the number and try again.'); return }
    setPkg(res.package); setStep('confirm')
  }

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => { setHP(e.target.result); setHB(e.target.result.split(',')[1]) }
    reader.readAsDataURL(file)
  }

  async function release() {
    if (!hB64) { setError('Take a handoff photo first.'); return }
    setError(''); setRel(true)
    const res = await api('/api/partner-data', { action: 'release-package', storeId: store.id, packageId: pkg.id, handoffPhotoBase64: hB64, handoffPhotoMime: 'image/jpeg' })
    setRel(false)
    if (res.error) { setError(res.error); return }
    setStep('done')
  }

  function reset() { setStep('code'); setCode(''); setPkg(null); setHP(null); setHB(null); setError('') }

  const fmt = iso => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }

  if (step === 'done') return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.25s ease', paddingBottom: 40 }}>
      <div style={{ fontSize: 30, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 20 }}>Released ✓</div>
      <Alert type="success">Package released. Balance updated +$0.75.</Alert>
      <InfoCard>
        <div style={{ fontWeight: 500 }}>{pkg?.customerName}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{pkg?.carrier} · arrived {fmt(pkg?.arrivedAt)}</div>
      </InfoCard>
      <BtnDark onClick={() => { reset(); onDone && onDone() }}>Back to home</BtnDark>
      <BtnOutline onClick={reset}>Release another</BtnOutline>
    </div>
  )

  if (step === 'handoff') return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.25s ease', paddingBottom: 40 }}>
      <BackLink onClick={() => setStep('confirm')} />
      <div style={{ fontSize: 28, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 4 }}>Handoff<br />Photo</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Take a photo of the package before handing it to the customer.</div>
      {error && <Alert type="error">{error}</Alert>}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={e => handleFile(e.target.files[0])} style={{ display: 'none' }} />
      {!hPreview
        ? <button onClick={() => fileRef.current.click()} style={{ width: '100%', aspectRatio: '4/3', background: C.gray, border: `1.5px dashed #c00`, borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', color: C.muted }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"><rect x="2" y="6" width="20" height="15" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M9 6V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/></svg>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Tap to take photo</span>
            <span style={{ fontSize: 12, color: '#c00' }}>Required before releasing</span>
          </button>
        : <>
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
              <img src={hPreview} alt="handoff" style={{ width: '100%' }} />
              <button onClick={() => { setHP(null); setHB(null) }} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>
            <BtnDark onClick={release} loading={releasing}>Release package</BtnDark>
            <BtnOutline onClick={() => fileRef.current.click()}>Retake</BtnOutline>
          </>
      }
    </div>
  )

  if (step === 'confirm') return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.25s ease', paddingBottom: 40 }}>
      <BackLink onClick={() => setStep('code')} />
      <div style={{ fontSize: 28, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 20 }}>Confirm<br />Pickup</div>
      {error && <Alert type="error">{error}</Alert>}
      <InfoCard>
        <FieldLabel>Customer</FieldLabel>
        <div style={{ fontSize: 17, fontWeight: 500 }}>{pkg?.customerName}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{pkg?.recipientName} on label</div>
      </InfoCard>
      <InfoCard>
        <FieldLabel>Package</FieldLabel>
        <div style={{ fontSize: 14 }}>{pkg?.carrier}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Arrived {fmt(pkg?.arrivedAt)}</div>
      </InfoCard>
      {pkg?.labelPhoto && <InfoCard><FieldLabel>Label photo</FieldLabel><img src={pkg.labelPhoto} alt="label" style={{ borderRadius: 8, width: '100%' }} /></InfoCard>}
      <div style={{ background: C.lime, borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
        <FieldLabel>Your earnings</FieldLabel>
        <div style={{ fontSize: 32, fontWeight: 300, letterSpacing: '-1px' }}>+$0.75</div>
      </div>
      <BtnDark onClick={() => setStep('handoff')}>Take handoff photo →</BtnDark>
      <BtnOutline onClick={reset}>Cancel</BtnOutline>
    </div>
  )

  return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.25s ease', paddingBottom: 40 }}>
      <BackLink onClick={onBack} />
      <div style={{ fontSize: 28, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 4 }}>Release<br />Package</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Enter the 6-digit code from the customer's phone.</div>
      {error && <Alert type="error">{error}</Alert>}
      <input
        type="tel" inputMode="numeric" value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000" maxLength={6}
        style={{ width: '100%', padding: '18px', background: C.gray, border: `1.5px solid ${code.length === 6 ? C.black : C.border}`, borderRadius: 14, fontSize: 42, fontWeight: 300, fontFamily: 'inherit', textAlign: 'center', letterSpacing: '0.12em', marginBottom: 16, color: C.black, outline: 'none', transition: 'border-color 0.15s' }}
      />
      <BtnDark onClick={lookup} loading={loading} disabled={code.length !== 6}>Look up code</BtnDark>
    </div>
  )
}

// ─── EARNINGS ─────────────────────────────────────────────────────────────────
function EarningsScreen({ store }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    api('/api/partner-data', { action: 'get-earnings', storeId: store.id }).then(res => {
      setLoading(false)
      if (res.error) { setError(res.error); return }
      setData(res)
    })
  }, [])

  const fmt = iso => { if (!iso) return '—'; return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }

  return (
    <div style={{ padding: '20px', animation: 'fadeIn 0.25s ease', paddingBottom: 40 }}>
      <div style={{ fontSize: 28, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 20 }}>Earnings</div>
      {loading && <Spinner />}
      {error && <Alert type="error">{error}</Alert>}
      {data && <>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <div style={{ background: C.gray, borderRadius: 20, padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: '-1px', marginBottom: 6 }}>${(data.balanceThisWeek || 0).toFixed(2)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, lineHeight: 1.3 }}>This<br />Week</div>
          </div>
          <div style={{ background: C.gray, borderRadius: 20, padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 30, fontWeight: 300, letterSpacing: '-1px', marginBottom: 6 }}>${(data.totalPaid || 0).toFixed(2)}</div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, lineHeight: 1.3 }}>All<br />Time</div>
          </div>
        </div>
        <SectionLabel>Transaction History</SectionLabel>
        {data.transactions.length === 0
          ? <div style={{ color: C.muted, fontSize: 13, padding: '16px 0' }}>No transactions yet.</div>
          : data.transactions.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>Week of {fmt(t.weekOf)}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{t.packagesCount} packages</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>${(t.amountOwed || 0).toFixed(2)}</div>
                <div style={{ fontSize: 11, color: t.status === 'Paid' ? '#1a7a3a' : C.muted, marginTop: 1 }}>{t.status === 'Paid' ? 'Paid ✓' : (t.status || '—')}</div>
              </div>
            </div>
          ))
        }
      </>}
    </div>
  )
}

// ─── SETUP SCREEN (one-time password creation) ────────────────────────────────
function SetupScreen({ token, onComplete }) {
  const [storeInfo, setInfo]    = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function validate() {
      const res = await fetch(`/api/partner-setup?token=${token}`)
      const data = await res.json()
      setLoading(false)
      if (data.error) { setError(data.error); return }
      if (data.alreadySet) {
        setError('You already have a password set. Just sign in normally.')
        return
      }
      setInfo(data)
    }
    validate()
  }, [token])

  async function handleSet() {
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSaving(true)
    const res = await api('/api/partner-setup', { action: 'set-password', token, password })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    saveSession(res.store)
    onComplete(res.store)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 24px', maxWidth: 480, margin: '0 auto', animation: 'fadeIn 0.25s ease' }}>
      <div style={{ marginBottom: 44 }}><Wordmark /></div>

      {loading && <Spinner />}

      {error && !storeInfo && (
        <>
          <Alert type="error">{error}</Alert>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>
            Contact <a href="mailto:hello@stuup.co" style={{ color: C.black, fontWeight: 600, textDecoration: 'none' }}>hello@stuup.co</a> for help.
          </div>
        </>
      )}

      {storeInfo && (
        <>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.muted, marginBottom: 4 }}>Welcome to Stuup</div>
          <div style={{ fontSize: 28, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.5px', marginBottom: 4 }}>{storeInfo.storeName}</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>
            Set a password for <strong style={{ color: C.black }}>{storeInfo.email}</strong>. You'll use this every time you log in.
          </div>

          {error && <Alert type="error">{error}</Alert>}

          <Input label="New password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" autoFocus />
          <Input label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Type it again" />

          <div style={{ marginTop: 6 }}>
            <BtnDark onClick={handleSet} loading={saving} disabled={!password || !confirm}>
              Set password & sign in
            </BtnDark>
          </div>
        </>
      )}
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [store, setStore] = useState(() => loadSession())
  const [view, setView]   = useState('home') // home | scan | release | earnings

  // Check if this is a setup link (e.g. partner.stuup.co/setup?token=XXX)
  const setupToken = new URLSearchParams(window.location.search).get('token')

  // Push a dummy history entry whenever we navigate away from home,
  // so the phone's back button hits that entry first instead of leaving the site.
  // When the browser fires popstate (back button), we intercept it and go to home.
  useEffect(() => {
    if (view !== 'home') {
      window.history.pushState({ stuup: true }, '')
    }
  }, [view])

  useEffect(() => {
    function handlePop() {
      setView('home')
      // Push again so subsequent back presses are also intercepted
      window.history.pushState({ stuup: true }, '')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  function handleLogin(s) {
    setStore(s)
    setView('home')
    window.history.replaceState({}, '', '/')
  }

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ minHeight: '100vh', background: C.white, color: C.black, display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto' }}>

        {setupToken && !store
          ? <SetupScreen token={setupToken} onComplete={handleLogin} />
          : !store
          ? <LoginScreen onLogin={handleLogin} />
          : <>
              <Header storeName={store.name} onLogout={() => { clearSession(); setStore(null) }} />
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {view === 'home' && (
                  <HomeScreen
                    store={store}
                    onScan={() => setView('scan')}
                    onRelease={() => setView('release')}
                  />
                )}
                {view === 'scan' && (
                  <ScanScreen
                    store={store}
                    onBack={() => setView('home')}
                    onDone={() => setView('home')}
                  />
                )}
                {view === 'release' && (
                  <ReleaseScreen
                    store={store}
                    onBack={() => setView('home')}
                    onDone={() => setView('home')}
                  />
                )}
                {view === 'earnings' && (
                  <EarningsScreen store={store} />
                )}
              </div>
              {/* Earnings tab link - subtle footer */}
              {view === 'home' && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 20px', display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => setView('earnings')} style={{ background: 'none', border: 'none', fontSize: 12, color: C.muted, cursor: 'pointer', fontWeight: 500 }}>
                    View earnings →
                  </button>
                </div>
              )}
              {view === 'earnings' && (
                <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 20px', display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => setView('home')} style={{ background: 'none', border: 'none', fontSize: 12, color: C.muted, cursor: 'pointer', fontWeight: 500 }}>
                    ← Back to home
                  </button>
                </div>
              )}
            </>
        }
      </div>
    </>
  )
}
