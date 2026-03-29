// partner-setup.js
// Handles the one-time password setup flow for new store partners
// GET  /api/partner-setup?token=XXX  → validates token, returns store info
// POST /api/partner-setup             → generates a setup token for a store
// POST /api/partner-setup (set)       → saves the new password

const BASE = 'appQ9yUmE2XCLAgE7'

// Simple token: base64 of storeId + timestamp + secret
// Not cryptographic — good enough for this use case
const SECRET = 'stuup2024'

function makeToken(storeId) {
  const payload = `${storeId}:${Date.now()}:${SECRET}`
  return btoa(payload).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

function parseToken(token) {
  try {
    const padded = token.replace(/-/g, '+').replace(/_/g, '/')
    const payload = atob(padded)
    const [storeId, timestamp, secret] = payload.split(':')
    if (secret !== SECRET) return null
    // Token valid for 7 days
    if (Date.now() - parseInt(timestamp) > 7 * 24 * 60 * 60 * 1000) return null
    return storeId
  } catch {
    return null
  }
}

async function airtable(method, path, body = null) {
  const PAT = Netlify.env.get('AIRTABLE_PAT')
  const opts = {
    method,
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`https://api.airtable.com/v0/${BASE}${path}`, opts)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Airtable error')
  return data
}

export default async (req) => {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  // ── GET: validate token and return store name ─────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    if (!token) return json({ error: 'Missing token' }, 400)

    const storeId = parseToken(token)
    if (!storeId) return json({ error: 'This setup link has expired or is invalid. Contact hello@stuup.co for a new one.' }, 401)

    try {
      const store = await airtable('GET', `/Stores/${storeId}`)
      const alreadySet = store.fields['Password Set']
      return json({
        valid: true,
        storeId,
        storeName: store.fields['Store Name'],
        email: store.fields['App Email'],
        alreadySet: !!alreadySet,
      })
    } catch {
      return json({ error: 'Store not found.' }, 404)
    }
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await req.json()

  // ── POST action=generate: create a setup link for a store ─────────────────
  if (body.action === 'generate') {
    const { email } = body
    if (!email) return json({ error: 'Email required' }, 400)

    const PAT = Netlify.env.get('AIRTABLE_PAT')
    const res = await fetch(
      `https://api.airtable.com/v0/${BASE}/Stores?filterByFormula=${encodeURIComponent(`{App Email}="${email.trim().toLowerCase()}"`)}&maxRecords=1`,
      { headers: { Authorization: `Bearer ${PAT}` } }
    )
    const data = await res.json()

    if (!data.records || data.records.length === 0) {
      return json({ error: 'No store found with that email.' }, 404)
    }

    const storeId = data.records[0].id
    const token = makeToken(storeId)
    const setupUrl = `https://partner.stuup.co/setup?token=${token}`

    return json({ success: true, setupUrl, storeId })
  }

  // ── POST action=set-password: save password and mark setup complete ────────
  if (body.action === 'set-password') {
    const { token, password } = body

    if (!token || !password) return json({ error: 'Missing token or password' }, 400)
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)

    const storeId = parseToken(token)
    if (!storeId) return json({ error: 'Setup link expired. Contact hello@stuup.co for a new one.' }, 401)

    await airtable('PATCH', `/Stores/${storeId}`, {
      fields: {
        'Store Password': password,
        'Password Set': true,
      },
    })

    // Fetch store to return login info
    const store = await airtable('GET', `/Stores/${storeId}`)

    return json({
      success: true,
      store: {
        id: storeId,
        name: store.fields['Store Name'],
        address: store.fields['Full Address'],
        ownerName: store.fields['Owner Name'],
        balanceThisWeek: store.fields['Balance This Week'] || 0,
        totalPaid: store.fields['Total Paid to Date'] || 0,
        status: store.fields['Status'],
      },
    })
  }

  return json({ error: 'Unknown action' }, 400)
}

export const config = {
  path: '/api/partner-setup',
}
