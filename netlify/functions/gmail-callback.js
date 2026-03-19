// netlify/functions/gmail-callback.js
// STEP 2 OF GMAIL OAUTH
// Google redirects the customer here after they approve access.
// URL: https://stuup.co/.netlify/functions/gmail-callback?code=...&state=...
//
// This function:
//   1. Exchanges the auth code for access + refresh tokens
//   2. Saves both tokens to the customer's Airtable CUSTOMERS record
//   3. Sets Email Connected = true
//   4. Redirects the customer back to the Stuup Customer App
//
// ENVIRONMENT VARIABLES REQUIRED:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  — from Google Cloud Console
//   SITE_URL  — https://stuup.co
//   APP_URL   — https://app.stuup.co

const fetch = require("node-fetch");
const { updateRecord } = require("./_airtable");

exports.handler = async (event) => {
  const { code, state, error } = event.queryStringParameters || {};
  const APP_URL = process.env.APP_URL;

  // If the customer denied access
  if (error) {
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?email_connect=denied` },
      body: "",
    };
  }

  // Decode the state to get customer_id
  const { customer_id: customerId } = JSON.parse(
    Buffer.from(state, "base64").toString("utf8")
  );

  const SITE_URL = process.env.SITE_URL || "https://stuup.co";

  // Exchange the auth code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${SITE_URL}/.netlify/functions/gmail-callback`,
      grant_type: "authorization_code",
    }),
  });

  const data = await tokenRes.json();

  if (data.error) {
    console.error("Gmail token exchange failed:", data.error, data.error_description);
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?email_connect=error` },
      body: "",
    };
  }

  // Save tokens to Airtable
  await updateRecord("Customers", customerId, {
    "Gmail Token": JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      obtained_at: new Date().toISOString(),
      expires_in: data.expires_in,
      provider: "gmail",
    }),
    "Email Connected": true,
  });

  // Redirect back to the Customer App with success
  return {
    statusCode: 302,
    headers: { Location: `${APP_URL}?email_connect=success` },
    body: "",
  };
};
