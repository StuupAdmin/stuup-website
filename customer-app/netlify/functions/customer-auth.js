// customer-auth.js
// Magic link auth for customers — OTP sent via Twilio SMS
// DEV BYPASS: kmowarin@gmail.com can always use code 000000 (stateless check, no memory needed)

const BASE = 'appQ9yUmE2XCLAgE7'
const DEV_BYPASS_EMAIL = 'kmowarin@gmail.com'
const DEV_BYPASS_CODE = '000000'

// In-memory OTP store (best-effort — may reset between requests on serverless)
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

async function getCustomerByEmail(email) {
  const data = await airtable('GET',
    `/Customers?filterByFormula=${encodeURIComponent(`{Email}="${email.trim().toLowerCase()}"`)}&maxRecords=1`
  )
  if (!data.records || data.records.length === 0) return null
  return data.records[0]
}

async function buildCustomerResponse(record) {
  const f = record.fields
  let storeAddress = ''
  let storeName = f['Name (from Assigned Store)']?.[0] || ''
  const storeLinks = f['Assigned Store']
  if (storeLinks && storeLinks.length > 0) {
    try {
      const store = await airtable('GET', `/Stores/${storeLinks[0]}`)
      storeAddress = store.fields['Full Address'] || ''
      storeName = store.fields['Store Name'] || storeName
    } catch (_) {}
  }
  return {
    id: record.id,
    name: f['Name'] || '',
    email: f['Email'] || '',
    phone: f['Phone'] || '',
    plan: f['Plan'] || '',
    accountStatus: f['Account Status'] || '',
    storeName,
    storeAddress,
    packagesThisMonth: f['Packages This Month'] || 0,
  }
}

export default async (req) => {
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await req.json()

  // ── SEND CODE ─────────────────────────────────────────────────────────────
  if (body.action === 'send-code') {
    const { email } = body
    if (!email) return json({ error: 'Email required' }, 400)

    const normalEmail = email.trim().toLowerCase()
    const customer = await getCustomerByEmail(normalEmail)

    if (!customer) {
      return json({ error: 'No account found for this email. Sign up at stuup.co first.' }, 404)
    }

    const phone = customer.fields['Phone']
    if (!phone) {
      return json({ error: 'No phone number on file. Contact hello@stuup.co.' }, 400)
    }

    // DEV BYPASS: skip SMS entirely for test account, just return success
    if (normalEmail === DEV_BYPASS_EMAIL) {
      return json({ success: true, phoneLast4: phone.slice(-4), devMode: true })
    }

    // Generate and store OTP for real accounts
    const otp = generateOTP()
    otpStore.set(normalEmail, { otp, expiry: Date.now() + 10 * 60 * 1000, customerId: customer.id })

    // Send via Twilio
    const TWILIO_SID = Netlify.env.get('TWILIO_ACCOUNT_SID')
    const TWILIO_TOKEN = Netlify.env.get('TWILIO_AUTH_TOKEN')
    const TWILIO_FROM = Netlify.env.get('TWILIO_PHONE_NUMBER')

    if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM) {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_FROM,
          Body: `Your Stuup sign-in code: ${otp}\n\nValid for 10 minutes. Don't share this code.`,
        }),
      })
    }

    return json({ success: true, phoneLast4: phone.slice(-4) })
  }

  // ── VERIFY CODE ───────────────────────────────────────────────────────────
  if (body.action === 'verify-code') {
    const { email, code } = body
    if (!email || !code) return json({ error: 'Email and code required' }, 400)

    const normalEmail = email.trim().toLowerCase()

    // DEV BYPASS: stateless check — no memory needed, always works
    if (normalEmail === DEV_BYPASS_EMAIL && code.toString() === DEV_BYPASS_CODE) {
      const customer = await getCustomerByEmail(normalEmail)
      if (!customer) return json({ error: 'Account not found.' }, 404)
      const customerData = await buildCustomerResponse(customer)
      return json({ success: true, customer: customerData })
    }

    // Normal OTP verification
    const stored = otpStore.get(normalEmail)
    if (!stored) return json({ error: 'Code expired or not found. Request a new one.' }, 401)
    if (Date.now() > stored.expiry) {
      otpStore.delete(normalEmail)
      return json({ error: 'Code expired. Request a new one.' }, 401)
    }
    if (stored.otp !== code.toString()) {
      return json({ error: 'Incorrect code. Try again.' }, 401)
    }

    otpStore.delete(normalEmail)

    const record = await airtable('GET', `/Customers/${stored.customerId}`)
    const customerData = await buildCustomerResponse(record)
    return json({ success: true, customer: customerData })
  }

  return json({ error: 'Unknown action' }, 400)
}

export const config = { path: '/api/customer-auth' }
