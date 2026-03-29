// customer-auth.js
// Magic link auth for customers — no password needed.
// POST { action: 'send-code', email } → looks up customer, sends 6-digit OTP via Twilio SMS
// POST { action: 'verify-code', email, code } → verifies OTP, returns customer record

const BASE = 'appQ9yUmE2XCLAgE7'

// In-memory OTP store — resets on cold start, good enough for single-instance use
// For production scale, move this to a KV store
const otpStore = new Map()

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
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

function safeCustomer(record) {
  const f = record.fields
  return {
    id: record.id,
    name: f['Name'] || '',
    email: f['Email'] || '',
    phone: f['Phone'] || '',
    plan: f['Plan'] || '',
    accountStatus: f['Account Status'] || '',
    assignedStore: f['Assigned Store'] || [],
    storeName: f['Name (from Assigned Store)']?.[0] || '',
    packagesThisMonth: f['Packages This Month'] || 0,
  }
}

export default async (req) => {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await req.json()

  // ── SEND OTP ──────────────────────────────────────────────────────────────
  if (body.action === 'send-code') {
    const { email } = body
    if (!email) return json({ error: 'Email required' }, 400)

    // Look up customer by email
    const data = await airtable('GET',
      `/Customers?filterByFormula=${encodeURIComponent(`{Email}="${email.trim().toLowerCase()}"`)}&maxRecords=1`
    )

    if (!data.records || data.records.length === 0) {
      return json({ error: 'No account found for this email. Sign up at stuup.co first.' }, 404)
    }

    const customer = data.records[0]
    const phone = customer.fields['Phone']

    if (!phone) {
      return json({ error: 'No phone number on file. Contact hello@stuup.co to update your account.' }, 400)
    }

    // DEV BYPASS: always accept 000000 for the founder's test account
    const DEV_EMAILS = ['kmowarin@gmail.com']
    const otp = generateOTP()
    const expiry = Date.now() + 10 * 60 * 1000 // 10 minutes

    // Store the real OTP plus the bypass code for dev accounts
    otpStore.set(email.toLowerCase(), { otp, expiry, customerId: customer.id })
    if (DEV_EMAILS.includes(email.toLowerCase())) {
      otpStore.set(email.toLowerCase() + '__bypass', { otp: '000000', expiry: Date.now() + 24 * 60 * 60 * 1000, customerId: customer.id })
    }

    // Send OTP via Twilio
    const TWILIO_SID = Netlify.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_TOKEN = Netlify.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_FROM = Netlify.env.get('TWILIO_PHONE_NUMBER')

    if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
      const smsBody = `Your Stuup sign-in code: ${otp}\n\nValid for 10 minutes. Don't share this code.`
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: TWILIO_FROM, Body: smsBody }),
      })
    }

    return json({ success: true, phoneLast4: phone.slice(-4) })
  }

  // ── VERIFY OTP ────────────────────────────────────────────────────────────
  if (body.action === 'verify-code') {
    const { email, code } = body
    if (!email || !code) return json({ error: 'Email and code required' }, 400)

    // Check bypass first for dev accounts
    const bypass = otpStore.get(email.toLowerCase() + '__bypass')
    const isBypass = bypass && code.toString() === '000000' && Date.now() <= bypass.expiry

    const stored = isBypass ? bypass : otpStore.get(email.toLowerCase())
    if (!stored) return json({ error: 'Code expired or not found. Request a new one.' }, 401)
    if (Date.now() > stored.expiry) {
      otpStore.delete(email.toLowerCase())
      return json({ error: 'Code expired. Request a new one.' }, 401)
    }
    if (stored.otp !== code.toString()) {
      return json({ error: 'Incorrect code. Try again.' }, 401)
    }

    otpStore.delete(email.toLowerCase())

    // Fetch full customer record
    const record = await airtable('GET', `/Customers/${stored.customerId}`)

    // Get store address if assigned
    let storeAddress = ''
    const storeLinks = record.fields['Assigned Store']
    if (storeLinks && storeLinks.length > 0) {
      try {
        const store = await airtable('GET', `/Stores/${storeLinks[0]}`)
        storeAddress = store.fields['Full Address'] || ''
      } catch (_) {}
    }

    return json({
      success: true,
      customer: { ...safeCustomer(record), storeAddress },
    })
  }

  return json({ error: 'Unknown action' }, 400)
}

export const config = { path: '/api/customer-auth' }
