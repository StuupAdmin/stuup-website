// Netlify serverless function: Airtable proxy for Partner App
// All reads and writes go through here so AIRTABLE_PAT stays secret

const BASE = 'appQ9yUmE2XCLAgE7'

async function airtable(method, path, body = null) {
  const PAT = Netlify.env.get('AIRTABLE_PAT')
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
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

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const { action, storeId, ...params } = await req.json()

  if (!storeId) return json({ error: 'storeId required' }, 400)

  try {
    // ── GET HOME DATA ────────────────────────────────────────────────────────
    if (action === 'get-home') {
      // Get store details
      const store = await airtable('GET', `/Stores/${storeId}`)

      // Get active packages for this store (Waiting or Code Issued)
      const today = new Date().toISOString().split('T')[0]
      const packages = await airtable(
        'GET',
        `/Packages?filterByFormula=${encodeURIComponent(
          `AND(FIND("${storeId}", ARRAYJOIN({Store})), OR({Status}="Waiting", {Status}="Code Issued"))`
        )}&sort[0][field]=Arrived At&sort[0][direction]=desc`
      )

      // Count arrived today
      const todayCount = (packages.records || []).filter((p) => {
        const arrivedAt = p.fields['Arrived At']
        return arrivedAt && arrivedAt.startsWith(today)
      }).length

      return json({
        store: {
          id: store.id,
          name: store.fields['Store Name'],
          address: store.fields['Full Address'],
          balanceThisWeek: store.fields['Balance This Week'] || 0,
          totalPaid: store.fields['Total Paid to Date'] || 0,
          currentPackageCount: store.fields['Current Package Count'] || 0,
        },
        packages: (packages.records || []).map((p) => ({
          id: p.id,
          trackingNumber: p.fields['Tracking Number'],
          recipientName: p.fields['Recipient Name on Label'],
          carrier: p.fields['Carrier'],
          status: p.fields['Status'],
          arrivedAt: p.fields['Arrived At'],
          labelPhoto: p.fields['Label Photo']?.[0]?.url || null,
        })),
        todayCount,
      })
    }

    // ── GET PENDING CONFIRMATION (most recent unmatched package) ─────────────
    if (action === 'get-pending-confirmation') {
      const packages = await airtable(
        'GET',
        `/Packages?filterByFormula=${encodeURIComponent(
          `AND(FIND("${storeId}", ARRAYJOIN({Store})), {Status}="Waiting", {Customer}="")`
        )}&sort[0][field]=Intake Timestamp&sort[0][direction]=desc&maxRecords=1`
      )

      if (!packages.records || packages.records.length === 0) {
        return json({ package: null })
      }

      const p = packages.records[0]
      return json({
        package: {
          id: p.id,
          trackingNumber: p.fields['Tracking Number'],
          recipientName: p.fields['Recipient Name on Label'],
          carrier: p.fields['Carrier'],
          labelPhoto: p.fields['Label Photo']?.[0]?.url || null,
        },
      })
    }

    // ── UPDATE PACKAGE CONDITION ─────────────────────────────────────────────
    if (action === 'confirm-package') {
      const { packageId, condition, conditionNote } = params
      const fields = { 'Package Condition on Arrival': condition }
      if (conditionNote) fields['Condition Note'] = conditionNote
      await airtable('PATCH', `/Packages/${packageId}`, { fields })
      return json({ success: true })
    }

    // ── DELETE PACKAGE (not a Stuup package) ─────────────────────────────────
    if (action === 'reject-package') {
      const { packageId } = params
      await airtable('DELETE', `/Packages/${packageId}`)
      return json({ success: true })
    }

    // ── LOOK UP PACKAGE BY CODE ──────────────────────────────────────────────
    if (action === 'lookup-code') {
      const { code } = params
      const packages = await airtable(
        'GET',
        `/Packages?filterByFormula=${encodeURIComponent(
          `AND(FIND("${storeId}", ARRAYJOIN({Store})), {6-Digit Code}=${code}, {Status}="Code Issued")`
        )}&maxRecords=1`
      )

      if (!packages.records || packages.records.length === 0) {
        return json({ package: null })
      }

      const p = packages.records[0]

      // Check code expiry
      const expiry = p.fields['Code Expiry']
      if (expiry && new Date(expiry) < new Date()) {
        return json({ package: null, expired: true })
      }

      // Get customer name via linked record
      let customerName = 'Customer'
      const customerLinks = p.fields['Customer']
      if (customerLinks && customerLinks.length > 0) {
        try {
          const cust = await airtable('GET', `/Customers/${customerLinks[0]}`)
          customerName = cust.fields['Name'] || 'Customer'
        } catch (_) {}
      }

      return json({
        package: {
          id: p.id,
          trackingNumber: p.fields['Tracking Number'],
          recipientName: p.fields['Recipient Name on Label'],
          carrier: p.fields['Carrier'],
          arrivedAt: p.fields['Arrived At'],
          labelPhoto: p.fields['Label Photo']?.[0]?.url || null,
          customerName,
        },
      })
    }

    // ── UPLOAD HANDOFF PHOTO AND RELEASE PACKAGE ─────────────────────────────
    if (action === 'release-package') {
      const { packageId, handoffPhotoBase64, handoffPhotoMime } = params

      // 1. Upload handoff photo as attachment
      const handoffFields = {
        'Handoff Photo': [
          {
            url: `data:${handoffPhotoMime};base64,${handoffPhotoBase64}`,
            filename: `handoff_${packageId}_${Date.now()}.jpg`,
          },
        ],
        Status: 'Collected',
        'Handoff Timestamp': new Date().toISOString(),
        'Collected At': new Date().toISOString(),
      }

      await airtable('PATCH', `/Packages/${packageId}`, { fields: handoffFields })
      return json({ success: true })
    }

    // ── GET EARNINGS DATA ────────────────────────────────────────────────────
    if (action === 'get-earnings') {
      const store = await airtable('GET', `/Stores/${storeId}`)

      const transactions = await airtable(
        'GET',
        `/Transactions?filterByFormula=${encodeURIComponent(
          `FIND("${storeId}", ARRAYJOIN({Store}))`
        )}&sort[0][field]=Week Of&sort[0][direction]=desc&maxRecords=20`
      )

      return json({
        balanceThisWeek: store.fields['Balance This Week'] || 0,
        totalPaid: store.fields['Total Paid to Date'] || 0,
        transactions: (transactions.records || []).map((t) => ({
          id: t.id,
          weekOf: t.fields['Week Of'],
          packagesCount: t.fields['Packages Count'] || 0,
          amountOwed: t.fields['Amount Owed'] || 0,
          status: t.fields['Status'],
          paidDate: t.fields['Paid Date'],
        })),
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export const config = {
  path: '/api/partner-data',
}
