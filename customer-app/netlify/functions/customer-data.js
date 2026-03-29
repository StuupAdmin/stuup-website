// customer-data.js — all Airtable reads for the customer app

const BASE = 'appQ9yUmE2XCLAgE7'

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
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await req.json()
  const { action, customerId } = body
  if (!customerId) return json({ error: 'customerId required' }, 400)

  try {
    // GET HOME DATA
    if (action === 'get-home') {
      const customer = await airtable('GET', `/Customers/${customerId}`)
      const f = customer.fields

      let store = null
      const storeLinks = f['Assigned Store']
      if (storeLinks && storeLinks.length > 0) {
        try {
          const s = await airtable('GET', `/Stores/${storeLinks[0]}`)
          store = {
            id: s.id,
            name: s.fields['Store Name'],
            address: s.fields['Full Address'],
            hours: s.fields['Hours'],
          }
        } catch (_) {}
      }

      const stuupPkgs = await airtable('GET',
        `/Packages?filterByFormula=${encodeURIComponent(
          `AND(FIND("${customerId}", ARRAYJOIN({Customer})), OR({Status}="Waiting", {Status}="Code Issued"))`
        )}&sort[0][field]=Arrived At&sort[0][direction]=desc&maxRecords=20`
      )

      const trackedPkgs = await airtable('GET',
        `/Tracked Packages?filterByFormula=${encodeURIComponent(
          `AND(FIND("${customerId}", ARRAYJOIN({Customer})), {Headed To Stuup}=0, OR({Current Status}="In Transit", {Current Status}="Out for Delivery", {Current Status}="Pre-Transit"))`
        )}&sort[0][field]=Last Updated&sort[0][direction]=desc&maxRecords=20`
      )

      const recentCollected = await airtable('GET',
        `/Packages?filterByFormula=${encodeURIComponent(
          `AND(FIND("${customerId}", ARRAYJOIN({Customer})), {Status}="Collected")`
        )}&sort[0][field]=Collected At&sort[0][direction]=desc&maxRecords=5`
      )

      return json({
        customer: {
          id: customer.id,
          name: f['Name'],
          email: f['Email'],
          plan: f['Plan'],
          accountStatus: f['Account Status'],
          packagesThisMonth: f['Packages This Month'] || 0,
          store,
          storeAddress: store?.address || '',
          storeName: store?.name || '',
        },
        stuupPackages: (stuupPkgs.records || []).map(p => ({
          id: p.id,
          trackingNumber: p.fields['Tracking Number'],
          carrier: p.fields['Carrier'],
          status: p.fields['Status'],
          arrivedAt: p.fields['Arrived At'],
          code: p.fields['6-Digit Code'],
          codeExpiry: p.fields['Code Expiry'],
          labelPhoto: p.fields['Label Photo']?.[0]?.url || null,
          isStuup: true,
        })),
        trackedPackages: (trackedPkgs.records || []).map(p => ({
          id: p.id,
          trackingNumber: p.fields['Tracking Number'],
          carrier: p.fields['Carrier'],
          retailer: p.fields['Retailer'],
          status: p.fields['Current Status'],
          estimatedDelivery: p.fields['Estimated Delivery'],
          destinationAddress: p.fields['Destination Address'],
          isStuup: false,
        })),
        recentCollected: (recentCollected.records || []).map(p => ({
          id: p.id,
          trackingNumber: p.fields['Tracking Number'],
          carrier: p.fields['Carrier'],
          collectedAt: p.fields['Collected At'],
          isStuup: true,
        })),
      })
    }

    // SUBMIT TRACKING NUMBER — sets Customer Tracking Input on the matching package
    if (action === 'submit-tracking') {
      const { packageId, trackingInput } = body
      if (!packageId || !trackingInput) return json({ error: 'packageId and trackingInput required' }, 400)

      await airtable('PATCH', `/Packages/${packageId}`, {
        fields: { 'Customer Tracking Input': trackingInput.trim() }
      })

      return json({ success: true })
    }

    // GET ALL PACKAGES (full history)
    if (action === 'get-all-packages') {
      const allStuup = await airtable('GET',
        `/Packages?filterByFormula=${encodeURIComponent(
          `FIND("${customerId}", ARRAYJOIN({Customer}))`
        )}&sort[0][field]=Arrived At&sort[0][direction]=desc&maxRecords=50`
      )

      const allTracked = await airtable('GET',
        `/Tracked Packages?filterByFormula=${encodeURIComponent(
          `FIND("${customerId}", ARRAYJOIN({Customer}))`
        )}&sort[0][field]=Last Updated&sort[0][direction]=desc&maxRecords=50`
      )

      return json({
        stuup: (allStuup.records || []).map(p => ({
          id: p.id,
          trackingNumber: p.fields['Tracking Number'],
          carrier: p.fields['Carrier'],
          status: p.fields['Status'],
          arrivedAt: p.fields['Arrived At'],
          collectedAt: p.fields['Collected At'],
          code: p.fields['6-Digit Code'],
          isStuup: true,
        })),
        tracked: (allTracked.records || []).map(p => ({
          id: p.id,
          trackingNumber: p.fields['Tracking Number'],
          carrier: p.fields['Carrier'],
          retailer: p.fields['Retailer'],
          status: p.fields['Current Status'],
          estimatedDelivery: p.fields['Estimated Delivery'],
          destinationAddress: p.fields['Destination Address'],
          headedToStuup: p.fields['Headed To Stuup'] || false,
          isStuup: false,
        })),
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    return json({ error: err.message }, 500)
  }
}

export const config = { path: '/api/customer-data' }
