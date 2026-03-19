// netlify/functions/easypost-webhook.js
// EasyPost calls this URL every time a tracked package changes status.
// URL: https://stuup.co/.netlify/functions/easypost-webhook
//
// This function:
//   1. Verifies the webhook signature
//   2. Finds the matching TRACKED_PACKAGES record in Airtable
//   3. Updates the status
//   4. If delivered, checks whether it arrived at a Stuup store or a home address
//
// ENVIRONMENT VARIABLES REQUIRED:
//   EASYPOST_WEBHOOK_SECRET  — from EasyPost dashboard when you add the webhook
//   AIRTABLE_API_KEY, AIRTABLE_BASE_ID  — used by _airtable.js

const crypto = require("crypto");
const { findRecord, updateRecord, findStoreByAddress } = require("./_airtable");

// Map EasyPost status strings to our Airtable status options
const STATUS_MAP = {
  unknown: "Label Created",
  pre_transit: "Label Created",
  in_transit: "In Transit",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered to Home", // Default — overridden if delivered to a Stuup store
  return_to_sender: "Exception",
  failure: "Exception",
  cancelled: "Cancelled",
  error: "Exception",
};

exports.handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  // Verify webhook signature if secret is configured
  const secret = process.env.EASYPOST_WEBHOOK_SECRET;
  if (secret) {
    const signature = event.headers["x-hmac-signature"];
    if (signature) {
      const computed = crypto
        .createHmac("sha256", secret)
        .update(event.body)
        .digest("hex");
      if (`hmac-sha256-hex=${computed}` !== signature) {
        console.error("Webhook signature mismatch");
        return { statusCode: 401, body: "Invalid signature" };
      }
    }
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  // EasyPost sends different event types — we only care about tracker updates
  if (!payload.result || !payload.result.tracking_code) {
    // Test event or non-tracker event — acknowledge it
    return { statusCode: 200, body: "OK — not a tracker event" };
  }

  const tracker = payload.result;
  const trackingCode = tracker.tracking_code;
  const easypostStatus = tracker.status;
  const estimatedDelivery = tracker.est_delivery_date;

  // Map to our status
  let stuupStatus = STATUS_MAP[easypostStatus] || "In Transit";

  // Find the matching TRACKED_PACKAGES record
  const record = await findRecord(
    "Tracked Packages",
    `{Tracking Number} = "${trackingCode.replace(/"/g, '\\"')}"`
  );

  if (!record) {
    console.log(`No TRACKED_PACKAGES record found for ${trackingCode}`);
    return { statusCode: 200, body: "OK — no matching record" };
  }

  // If status is "delivered", check if it was delivered to a Stuup store
  if (easypostStatus === "delivered") {
    // Check the destination address against our stores
    const destinationAddress = record.fields["Destination Address"];
    if (destinationAddress) {
      const store = await findStoreByAddress(destinationAddress);
      if (store) {
        stuupStatus = "Delivered to Stuup Store";
      }
    }

    // Also check if Headed To Stuup was already flagged
    if (record.fields["Headed To Stuup"]) {
      stuupStatus = "Delivered to Stuup Store";
    }
  }

  // Build update fields
  const updateFields = {
    "Current Status": stuupStatus,
    "Last Updated": new Date().toISOString(),
  };

  if (estimatedDelivery) {
    updateFields["Estimated Delivery"] = estimatedDelivery;
  }

  // Update the record
  await updateRecord("Tracked Packages", record.id, updateFields);

  console.log(`Updated ${trackingCode}: ${stuupStatus}`);
  return { statusCode: 200, body: "OK" };
};
