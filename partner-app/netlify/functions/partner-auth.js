// Netlify serverless function: handles Partner App authentication
// Called from the React app — keeps AIRTABLE_PAT secret on the server

const AIRTABLE_BASE_ID = 'appQ9yUmE2XCLAgE7'

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { action, email, password, newPassword, storeId } = await req.json()
  const PAT = Netlify.env.get('AIRTABLE_PAT')

  if (!PAT) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  if (action === 'login') {
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Stores?filterByFormula=${encodeURIComponent(`{App Email}="${email.trim().toLowerCase()}"`)}&maxRecords=1`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PAT}` },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Database error. Try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json()

    if (!data.records || data.records.length === 0) {
      return new Response(JSON.stringify({ error: 'No account found for this email.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const store = data.records[0]
    const storedPassword = store.fields['Store Password']

    if (!storedPassword) {
      return new Response(JSON.stringify({ error: 'Password not set. Contact hello@stuup.co to activate your account.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (storedPassword !== password) {
      return new Response(JSON.stringify({ error: 'Incorrect password.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Return safe store data (no password)
    return new Response(JSON.stringify({
      success: true,
      store: {
        id: store.id,
        name: store.fields['Store Name'],
        address: store.fields['Full Address'],
        ownerName: store.fields['Owner Name'],
        balanceThisWeek: store.fields['Balance This Week'] || 0,
        totalPaid: store.fields['Total Paid to Date'] || 0,
        status: store.fields['Status'],
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── SET PASSWORD (first-time setup or reset) ───────────────────────────────
  if (action === 'set-password') {
    if (!email || !newPassword || !storeId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Verify the email matches the storeId before allowing password set
    const verifyRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Stores/${storeId}`,
      { headers: { Authorization: `Bearer ${PAT}` } }
    )

    if (!verifyRes.ok) {
      return new Response(JSON.stringify({ error: 'Store not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const storeData = await verifyRes.json()
    const appEmail = storeData.fields['App Email']

    if (!appEmail || appEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Email does not match this store account.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Update the password
    const updateRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Stores/${storeId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: { 'Store Password': newPassword } }),
      }
    )

    if (!updateRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to save password. Try again.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = {
  path: '/api/partner-auth',
}
