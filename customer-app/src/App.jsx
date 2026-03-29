import { useState, useEffect, useRef } from 'react'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  white:    '#FFFFFF',
  black:    '#111111',
  lime:     '#E5F6A1',
  dark:     '#161618',
  gray:     '#F0F0F0',
  grayDark: '#E0E0E0',
  muted:    '#666666',
  border:   'rgba(0,0,0,0.08)',
  borderStrong: '1px solid #111111',
}

const globalStyle = `
  :root {
    --font: -apple-system, BlinkMacSystemFont, 'Inter', 'Helvetica Neue', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body, #root { height: 100%; background: #fff; }
  body { font-family: var(--font); -webkit-font-smoothing: antialiased; color: #111; overscroll-behavior: none; }
  input, button, textarea { font-family: inherit; }
  input:focus { outline: none; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  button:not(:disabled):active { opacity: 0.75; }
  img { display: block; max-width: 100%; }
  ::-webkit-scrollbar { display: none; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes spin { to { transform: rotate(360deg); } }
`

// ─── SESSION ──────────────────────────────────────────────────────────────────
const SESSION_KEY = 'stuup_customer_v1'
const saveSession = (c) => localStorage.setItem(SESSION_KEY, JSON.stringify(c))
const loadSession = () => { try { const s = localStorage.getItem(SESSION_KEY); return s ? JSON.parse(s) : null } catch { return null } }
const clearSession = () => localStorage.removeItem(SESSION_KEY)

// ─── API ──────────────────────────────────────────────────────────────────────
async function api(endpoint, body) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ─── SHARED UI ────────────────────────────────────────────────────────────────
const LogoMark = () => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
    <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.black }} />
    <div style={{ width: 12, height: 12, borderRadius: '50%', border: `2px solid ${C.black}`, background: 'transparent' }} />
  </div>
)

const Pill = ({ children, variant = 'outline', style: sx = {} }) => {
  const variants = {
    outline: { border: `1px solid ${C.black}`, background: 'transparent', color: C.black },
    dark:    { background: C.dark, color: '#fff', border: 'none' },
    lime:    { background: C.lime, color: C.black, border: 'none' },
    light:   { border: `1px solid ${C.black}`, background: C.white, color: C.black, padding: '4px 12px', fontSize: 12 },
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', borderRadius: 999, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', ...variants[variant], ...sx }}>
      {children}
    </span>
  )
}

const Card = ({ children, variant = 'gray', style: sx = {}, onClick }) => {
  const variants = {
    lime:  { background: C.lime, color: C.black },
    dark:  { background: C.dark, color: '#fff' },
    gray:  { background: C.gray, color: C.black, backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' },
    white: { background: C.white, color: C.black },
  }
  return (
    <div
      onClick={onClick}
      style={{ borderRadius: 24, padding: 24, position: 'relative', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.15s', ...variants[variant], ...sx }}
      onTouchStart={onClick ? e => e.currentTarget.style.transform = 'scale(0.98)' : undefined}
      onTouchEnd={onClick ? e => e.currentTarget.style.transform = 'scale(1)' : undefined}
    >
      {children}
    </div>
  )
}

const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
    <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTopColor: C.black, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>
)

const Alert = ({ type = 'error', children }) => {
  const c = { error: ['#fff5f5', '#c00', '#c00'], success: ['#f0faf4', '#1a7a3a', '#1a7a3a'] }[type]
  return <div style={{ background: c[0], border: `1px solid ${c[1]}`, borderRadius: 10, padding: '11px 14px', color: c[2], fontSize: 13, marginBottom: 14, lineHeight: 1.4 }}>{children}</div>
}

// Package icon SVG
const PkgIcon = ({ outlined = false }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
const BottomNav = ({ active, onChange }) => (
  <div style={{ position: 'fixed', bottom: 24, left: 0, width: '100%', display: 'flex', justifyContent: 'center', zIndex: 100, padding: '0 16px', pointerEvents: 'none' }}>
    <nav style={{ background: C.dark, borderRadius: 999, display: 'flex', padding: 8, gap: 8, pointerEvents: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}>
      {[
        ['home', <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>],
        ['packages', <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>],
        ['find', <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>],
        ['account', <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>],
      ].map(([id, icon]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          style={{ width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active === id ? 'rgba(255,255,255,0.12)' : 'transparent', border: 'none', color: active === id ? '#fff' : 'rgba(255,255,255,0.45)', cursor: 'pointer', transition: 'all 0.15s' }}
        >
          {icon}
        </button>
      ))}
    </nav>
  </div>
)

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [step, setStep]         = useState('email') // email | code
  const [email, setEmail]       = useState('')
  const [code, setCode]         = useState('')
  const [phoneLast4, setPhone]  = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSendCode() {
    setError('')
    if (!email.trim()) { setError('Enter your email address.'); return }
    setLoading(true)
    const res = await api('/api/customer-auth', { action: 'send-code', email: email.trim().toLowerCase() })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setPhone(res.phoneLast4)
    setStep('code')
  }

  async function handleVerify() {
    setError('')
    if (code.length !== 6) { setError('Enter the 6-digit code.'); return }
    setLoading(true)
    const res = await api('/api/customer-auth', { action: 'verify-code', email: email.trim().toLowerCase(), code })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    saveSession(res.customer)
    onLogin(res.customer)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 20px', maxWidth: 480, margin: '0 auto', animation: 'fadeIn 0.25s ease' }}>
      <div style={{ marginBottom: 48 }}>
        <LogoMark />
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', color: C.black, marginTop: 10 }}>stuup</div>
      </div>

      {step === 'email' ? <>
        <div style={{ fontSize: 36, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>Sign in<br />to Stuup</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 32 }}>We'll text you a code — no password needed.</div>
        {error && <Alert type="error">{error}</Alert>}
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>Email address</div>
        <input
          type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com" autoFocus
          onKeyDown={e => e.key === 'Enter' && handleSendCode()}
          style={{ width: '100%', padding: '13px 16px', border: `1px solid ${C.grayDark}`, borderRadius: 12, fontSize: 16, marginBottom: 14, background: C.gray }}
        />
        <button
          onClick={handleSendCode} disabled={!email || loading}
          style={{ width: '100%', padding: '14px', background: C.lime, color: C.black, border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          {loading ? '…' : 'Send sign-in code'}
        </button>
        <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 20 }}>
          Not a member? <a href="https://stuup.co" style={{ color: C.black, fontWeight: 600 }}>Sign up at stuup.co</a>
        </div>
      </> : <>
        <div style={{ fontSize: 36, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>Check<br />your texts</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 32 }}>We sent a 6-digit code to the number ending in ···{phoneLast4}.</div>
        {error && <Alert type="error">{error}</Alert>}
        <input
          type="tel" inputMode="numeric" value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000" maxLength={6} autoFocus
          style={{ width: '100%', padding: '20px', background: C.gray, border: `1.5px solid ${code.length === 6 ? C.black : C.grayDark}`, borderRadius: 14, fontSize: 42, fontWeight: 300, textAlign: 'center', letterSpacing: '0.12em', marginBottom: 16, color: C.black, outline: 'none', transition: 'border-color 0.15s' }}
        />
        <button
          onClick={handleVerify} disabled={code.length !== 6 || loading}
          style={{ width: '100%', padding: '14px', background: C.dark, color: '#fff', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 10 }}
        >
          {loading ? '…' : 'Sign in'}
        </button>
        <button onClick={() => { setStep('email'); setCode(''); setError('') }} style={{ width: '100%', padding: '12px', background: 'transparent', color: C.muted, border: 'none', fontSize: 13, cursor: 'pointer' }}>
          Use a different email
        </button>
      </>}
    </div>
  )
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function HomeScreen({ customer: initCustomer, onNavigate, onRefreshCustomer }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  async function load() {
    setLoading(true); setError('')
    const res = await api('/api/customer-data', { action: 'get-home', customerId: initCustomer.id })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setData(res)
    if (res.customer) onRefreshCustomer(res.customer)
  }

  useEffect(() => { load() }, [])

  const allActive = data ? [...(data.stuupPackages || []), ...(data.trackedPackages || [])] : []
  const inTransitCount = (data?.trackedPackages || []).length
  const deliveredCount = (data?.recentCollected || []).length

  const fmtDate = iso => {
    if (!iso) return '—'
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.round((now - d) / 3600000)
    if (diff < 1) return 'Just now'
    if (diff < 24) return `${diff}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusLabel = (pkg) => {
    if (pkg.isStuup) {
      if (pkg.status === 'Code Issued') return 'Ready for pickup'
      if (pkg.status === 'Waiting') return 'At your store'
      return pkg.status
    }
    return pkg.status || 'In transit'
  }

  // Find the most urgent package for the hero card
  const heroPackage = data?.stuupPackages?.[0] || data?.trackedPackages?.[0] || null

  return (
    <div style={{ paddingBottom: 100, animation: 'fadeIn 0.25s ease' }}>
      {/* Header */}
      <header style={{ padding: '24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <LogoMark />
        <button onClick={() => onNavigate('find')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 999, border: `1px solid ${C.black}`, background: 'transparent', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Find a package
        </button>
      </header>

      {/* Title */}
      <h1 style={{ fontSize: '2.5rem', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 24px', padding: '0 16px' }}>
        Track Your<br />Deliveries
      </h1>

      {loading && <Spinner />}
      {error && <div style={{ padding: '0 16px' }}><Alert type="error">{error}</Alert></div>}

      {data && <>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>

          {/* Hero card — most urgent package */}
          {heroPackage ? (
            <Card variant={heroPackage.isStuup ? 'lime' : 'gray'} onClick={() => onNavigate('packages')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <Pill variant="dark">{heroPackage.isStuup ? (heroPackage.status === 'Code Issued' ? 'Ready for pickup' : 'At your store') : (heroPackage.status || 'In transit')}</Pill>
                <span style={{ fontSize: 28, fontWeight: 300 }}>↗</span>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 4 }}>
                  {heroPackage.retailer || heroPackage.carrier || 'Package'}
                  {heroPackage.isStuup && <Pill variant="lime" style={{ marginLeft: 8, fontSize: 11, padding: '3px 10px', verticalAlign: 'middle' }}>Stuup Pickup</Pill>}
                </div>
                <div style={{ fontSize: 14, opacity: 0.7 }}>
                  {heroPackage.isStuup
                    ? `${data.customer.storeName || 'Your pickup store'} · ${fmtDate(heroPackage.arrivedAt)}`
                    : heroPackage.destinationAddress || 'Tracking active'
                  }
                </div>
              </div>
            </Card>
          ) : (
            <Card variant="lime">
              <div style={{ fontSize: 20, fontWeight: 400, marginBottom: 4 }}>No active packages</div>
              <div style={{ fontSize: 14, opacity: 0.7 }}>Your deliveries will appear here.</div>
            </Card>
          )}

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Card variant="gray" style={{ minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 8 }}>
                {String(inTransitCount).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>In Transit</div>
            </Card>
            <Card variant="dark" style={{ minHeight: 140, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ fontSize: 48, fontWeight: 300, letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 8 }}>
                {String(data.customer.packagesThisMonth || 0).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>This month</div>
            </Card>
          </div>
        </div>

        {/* Active shipments list */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '28px 16px 12px' }}>
          <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>Active Shipments</div>
          <span style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.5 }}>ALL · {allActive.length}</span>
        </div>

        {allActive.length === 0 && (
          <div style={{ padding: '20px 16px', color: C.muted, fontSize: 13 }}>No active shipments right now.</div>
        )}

        {allActive.map((pkg, i) => (
          <div
            key={pkg.id}
            onClick={() => onNavigate('packages', pkg)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: C.white, cursor: 'pointer' }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: pkg.isStuup ? 'transparent' : C.gray, border: pkg.isStuup ? `1px solid ${C.black}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: C.black }}>
              <PkgIcon />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{pkg.retailer || pkg.carrier || 'Package'}</span>
                {pkg.isStuup && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: C.lime, color: C.black, fontSize: 10, fontWeight: 600 }}>Stuup Pickup</span>}
              </div>
              <div style={{ fontSize: 13, color: C.muted }}>{getStatusLabel(pkg)}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {pkg.isStuup && pkg.status === 'Code Issued'
                ? <Pill variant="light" style={{ fontSize: 11, padding: '4px 10px' }}>Code ready</Pill>
                : pkg.estimatedDelivery
                ? <Pill variant="light" style={{ fontSize: 11, padding: '4px 10px' }}>{new Date(pkg.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Pill>
                : <span style={{ fontSize: 12, color: C.muted }}>{fmtDate(pkg.arrivedAt || pkg.lastUpdated)}</span>
              }
            </div>
          </div>
        ))}
      </>}
    </div>
  )
}

// ─── PACKAGES ─────────────────────────────────────────────────────────────────
function PackagesScreen({ customer, initialPackage, onNavigate }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(initialPackage || null)
  const [error, setError]       = useState('')

  useEffect(() => {
    api('/api/customer-data', { action: 'get-all-packages', customerId: customer.id })
      .then(res => {
        setLoading(false)
        if (res.error) { setError(res.error); return }
        setData(res)
      })
  }, [])

  const fmtDate = iso => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const statusColor = (pkg) => {
    if (pkg.isStuup) {
      if (pkg.status === 'Code Issued') return C.lime
      if (pkg.status === 'Collected') return C.gray
      return C.gray
    }
    return C.gray
  }

  // Package detail view
  if (selected) {
    const isStuup = selected.isStuup
    return (
      <div style={{ paddingBottom: 100, animation: 'fadeIn 0.2s ease' }}>
        <header style={{ padding: '24px 16px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', zIndex: 10, borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: 0 }}>← Back</button>
        </header>

        <div style={{ padding: 16 }}>
          {/* If not Stuup package — upsell header */}
          {!isStuup && (
            <Card variant="lime" style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>Next time, send it to Stuup</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>This package is going to another address. Route it to your Stuup pickup store instead — no more missed deliveries or porch theft.</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.black }}>Your Stuup address:<br />{customer.storeAddress ? <span style={{ fontWeight: 400 }}>{customer.storeName}<br />{customer.storeAddress}<br />Attn: {customer.name}</span> : 'Set up a store in your account'}</div>
            </Card>
          )}

          {/* Package header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 22, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
                {isStuup ? 'Stuup Pickup' : (selected.retailer || selected.carrier || 'Package')}
              </div>
              {isStuup && <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, background: C.lime, color: C.black, fontSize: 11, fontWeight: 600 }}>Stuup Pickup</span>}
            </div>
            <div style={{ fontSize: 13, color: C.muted, fontFamily: 'monospace' }}>{selected.trackingNumber}</div>
          </div>

          {/* Status card */}
          <Card variant={isStuup && selected.status === 'Code Issued' ? 'lime' : 'gray'} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 6 }}>Status</div>
            <div style={{ fontSize: 18, fontWeight: 400 }}>
              {isStuup
                ? (selected.status === 'Code Issued' ? 'Ready for pickup' : selected.status === 'Waiting' ? 'Arrived at your store' : selected.status)
                : (selected.status || 'In transit')}
            </div>
            {isStuup && selected.arrivedAt && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Arrived {fmtDate(selected.arrivedAt)}</div>}
            {!isStuup && selected.estimatedDelivery && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Est. delivery: {fmtDate(selected.estimatedDelivery)}</div>}
          </Card>

          {/* Pickup code — shown if Code Issued */}
          {isStuup && selected.status === 'Code Issued' && selected.code && (
            <Card variant="white" style={{ border: `1.5px solid ${C.black}`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 8 }}>Your pickup code</div>
              <div style={{ fontSize: 44, fontWeight: 300, letterSpacing: '0.12em', color: C.black }}>{selected.code}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>Show this at your pickup store. {selected.codeExpiry ? `Expires ${fmtDate(selected.codeExpiry)}.` : ''}</div>
            </Card>
          )}

          {/* Waiting — pickup code not yet issued */}
          {isStuup && selected.status === 'Waiting' && !selected.code && (
            selected.trackingNumber
              ? (
                // Tracking number already known from email scrape — code generating automatically
                <Card variant="lime" style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.black, marginBottom: 6 }}>Your code is being generated</div>
                  <div style={{ fontSize: 13, color: '#3a5200' }}>We already have your tracking number. Your 6-digit pickup code will arrive by SMS within a minute — no action needed.</div>
                </Card>
              ) : (
                // No tracking number on file — customer needs to submit it
                <Card variant="gray" style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Get your pickup code</div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>We need your tracking number to verify and issue your 6-digit pickup code.</div>
                  <button onClick={() => onNavigate('find', selected)} style={{ display: 'block', width: '100%', padding: '13px', background: C.lime, color: C.black, border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Enter tracking number →
                  </button>
                </Card>
              )
          )}

          {/* Details */}
          <div style={{ background: C.gray, borderRadius: 16, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 10 }}>Details</div>
            {[
              ['Carrier', selected.carrier],
              ['Tracking', selected.trackingNumber ? `···${selected.trackingNumber.slice(-8)}` : '—'],
              isStuup ? ['Store', customer.storeName] : ['Destination', selected.destinationAddress],
              isStuup ? ['Arrived', fmtDate(selected.arrivedAt)] : ['Est. delivery', fmtDate(selected.estimatedDelivery)],
              isStuup && selected.collectedAt ? ['Collected', fmtDate(selected.collectedAt)] : null,
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{value || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Package list view
  const allPkgs = data ? [...(data.stuup || []), ...(data.tracked || [])] : []

  return (
    <div style={{ paddingBottom: 100, animation: 'fadeIn 0.25s ease' }}>
      <header style={{ padding: '24px 16px 16px', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <LogoMark />
      </header>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 24px', padding: '0 16px' }}>
        All<br />Packages
      </h1>

      {loading && <Spinner />}
      {error && <div style={{ padding: '0 16px' }}><Alert type="error">{error}</Alert></div>}

      {!loading && allPkgs.length === 0 && (
        <div style={{ padding: '20px 16px', color: C.muted, fontSize: 13 }}>No packages yet.</div>
      )}

      {allPkgs.map((pkg, i) => (
        <div
          key={pkg.id}
          onClick={() => setSelected(pkg)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: `1px solid ${C.border}`, background: C.white, cursor: 'pointer' }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, background: pkg.isStuup ? 'transparent' : C.gray, border: pkg.isStuup ? `1px solid ${C.black}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PkgIcon />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{pkg.retailer || pkg.carrier || 'Package'}</span>
              {pkg.isStuup && <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: C.lime, color: C.black, fontSize: 10, fontWeight: 600 }}>Stuup Pickup</span>}
            </div>
            <div style={{ fontSize: 13, color: C.muted }}>
              {pkg.isStuup
                ? (pkg.status === 'Collected' ? 'Collected' : pkg.status === 'Code Issued' ? 'Ready for pickup' : 'At your store')
                : (pkg.status || 'In transit')}
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>
            {fmtDate(pkg.arrivedAt || pkg.estimatedDelivery || pkg.collectedAt)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── FIND A PACKAGE ───────────────────────────────────────────────────────────
function FindScreen({ customer, initialPackage }) {
  const [tracking, setTracking]   = useState('')
  const [packageId, setPackageId] = useState(initialPackage?.id || '')
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')

  async function handleSubmit() {
    if (!tracking.trim()) { setError('Enter a tracking number.'); return }
    if (!packageId) { setError('No package selected. Come from an active package to submit your tracking number.'); return }
    setError(''); setLoading(true)
    const res = await api('/api/customer-data', { action: 'submit-tracking', customerId: customer.id, packageId, trackingInput: tracking.trim() })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setSuccess(true)
  }

  if (success) return (
    <div style={{ padding: '40px 20px', animation: 'fadeIn 0.25s ease', maxWidth: 480, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}><LogoMark /></div>
      <div style={{ fontSize: 32, fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em', marginBottom: 8 }}>All done</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>Tracking number submitted. We're verifying it now — you'll get a text with your pickup code within a minute.</div>
      <Card variant="lime">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>What happens next</div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>Once verified, you'll receive a 6-digit pickup code by SMS and email. Take it to your Stuup store to collect your package.</div>
      </Card>
    </div>
  )

  return (
    <div style={{ paddingBottom: 100, animation: 'fadeIn 0.25s ease' }}>
      <header style={{ padding: '24px 16px', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <LogoMark />
      </header>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 20px', padding: '0 16px' }}>
        Find a<br />Package
      </h1>

      <div style={{ padding: '0 16px' }}>
        {/* Lime hero card */}
        <div style={{ background: C.lime, borderRadius: 22, padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.black, marginBottom: 4 }}>Got a delivery notification?</div>
          <div style={{ fontSize: 13, color: '#3a5200' }}>Enter your tracking number below and we'll verify it and send your 6-digit pickup code by SMS — usually within a minute.</div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {initialPackage && (
          <div style={{ background: C.gray, borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 4 }}>Linking to package</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{initialPackage.carrier || 'Package'} · ···{(initialPackage.trackingNumber || '').slice(-6)}</div>
          </div>
        )}

        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>Tracking number</div>
        <input
          type="text" value={tracking}
          onChange={e => setTracking(e.target.value.trim())}
          placeholder="e.g. 1Z999AA10123456784"
          autoFocus
          style={{ width: '100%', padding: '13px 16px', border: `1.5px solid ${C.black}`, borderRadius: 12, fontSize: 15, marginBottom: 16, background: C.white, fontFamily: 'monospace' }}
        />

        {!initialPackage && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, padding: '10px 14px', background: C.gray, borderRadius: 10 }}>
            Tip: open the package waiting at your store first, then tap "Enter tracking number" to link it here automatically.
          </div>
        )}

        <button
          onClick={handleSubmit} disabled={!tracking || loading}
          style={{ display: 'block', width: '100%', padding: '14px', background: C.lime, color: C.black, border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          {loading ? '…' : 'Get my pickup code →'}
        </button>
      </div>
    </div>
  )
}

// ─── ACCOUNT ──────────────────────────────────────────────────────────────────
function AccountScreen({ customer, onLogout }) {
  const planLimits = { Starter: 3, Standard: 8, Power: 15, Trial: 3, 'Pay-Per-Package': '∞' }
  const limit = planLimits[customer.plan] || '—'

  return (
    <div style={{ paddingBottom: 100, animation: 'fadeIn 0.25s ease' }}>
      <header style={{ padding: '24px 16px', position: 'sticky', top: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <LogoMark />
      </header>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 300, textTransform: 'uppercase', letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 24px', padding: '0 16px' }}>
        {customer.name?.split(' ')[0] || 'Account'}
      </h1>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Delivery address */}
        <Card variant="lime">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 8 }}>Your Stuup delivery address</div>
          {customer.storeAddress ? <>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>{customer.storeName}</div>
            <div style={{ fontSize: 14, marginBottom: 2 }}>{customer.storeAddress}</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Attn: {customer.name}</div>
          </> : (
            <div style={{ fontSize: 13, opacity: 0.7 }}>No store assigned yet. Contact hello@stuup.co.</div>
          )}
        </Card>

        {/* Plan */}
        <Card variant="gray">
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6, marginBottom: 8 }}>Plan</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 24, fontWeight: 300 }}>{customer.plan || '—'}</div>
            <div style={{ fontSize: 13, color: C.muted }}>{customer.packagesThisMonth} / {limit} packages this month</div>
          </div>
        </Card>

        {/* Account info */}
        <div style={{ background: C.gray, borderRadius: 16, padding: '14px 16px' }}>
          {[
            ['Name', customer.name],
            ['Email', customer.email],
            ['Status', customer.accountStatus],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{value || '—'}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onLogout}
          style={{ display: 'block', width: '100%', padding: '14px', background: 'transparent', color: C.black, border: `1px solid ${C.black}`, borderRadius: 999, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 8 }}
        >
          Sign out
        </button>

        <div style={{ fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 4 }}>
          Questions? <a href="mailto:hello@stuup.co" style={{ color: C.black, fontWeight: 600 }}>hello@stuup.co</a>
        </div>
      </div>
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [customer, setCustomer] = useState(() => loadSession())
  const [view, setView]         = useState('home')
  const [viewParams, setParams] = useState(null)

  // Back button interception — same pattern as partner app
  useEffect(() => {
    if (view !== 'home') {
      window.history.pushState({ stuup: true }, '')
    }
  }, [view])

  useEffect(() => {
    function handlePop() {
      setView(v => {
        if (v === 'home') return v
        return 'home'
      })
      setParams(null)
      window.history.pushState({ stuup: true }, '')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  function navigate(screen, params = null) {
    setView(screen)
    setParams(params)
  }

  function handleLogin(c) {
    setCustomer(c)
    setView('home')
    window.history.replaceState({}, '', '/')
  }

  function handleLogout() {
    clearSession()
    setCustomer(null)
    setView('home')
    setParams(null)
  }

  if (!customer) return (
    <>
      <style>{globalStyle}</style>
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh' }}>
        <LoginScreen onLogin={handleLogin} />
      </div>
    </>
  )

  return (
    <>
      <style>{globalStyle}</style>
      <div style={{ maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', position: 'relative' }}>
        <div style={{ overflowY: 'auto', minHeight: '100vh' }}>
          {view === 'home' && (
            <HomeScreen
              customer={customer}
              onNavigate={navigate}
              onRefreshCustomer={c => { setCustomer(c); saveSession(c) }}
            />
          )}
          {view === 'packages' && (
            <PackagesScreen
              customer={customer}
              initialPackage={viewParams}
              onNavigate={navigate}
            />
          )}
          {view === 'find' && (
            <FindScreen
              customer={customer}
              initialPackage={viewParams}
            />
          )}
          {view === 'account' && (
            <AccountScreen customer={customer} onLogout={handleLogout} />
          )}
        </div>
        <BottomNav active={view} onChange={id => navigate(id)} />
      </div>
    </>
  )
}
