// netlify/functions/_token-refresh.js
// Refreshes expired Gmail and Outlook OAuth tokens automatically.
// Called internally by other functions before making Gmail/Outlook API calls.
// NOT a public endpoint.
//
// ENVIRONMENT VARIABLES REQUIRED:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET  — for Gmail refresh
//   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET  — for Outlook refresh

const fetch = require("node-fetch");
const { updateRecord } = require("./_airtable");

// Refresh a Gmail token
async function refreshGmailToken(customerId, tokenData) {
  const parsed = typeof tokenData === "string" ? JSON.parse(tokenData) : tokenData;

  if (!parsed.refresh_token) {
    throw new Error("No refresh_token found in Gmail token data");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: parsed.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Gmail token refresh failed: ${data.error} — ${data.error_description}`);
  }

  // Update token in Airtable (keep existing refresh_token since Google doesn't always return a new one)
  const updatedToken = {
    access_token: data.access_token,
    refresh_token: parsed.refresh_token,
    obtained_at: new Date().toISOString(),
    expires_in: data.expires_in,
    provider: "gmail",
  };

  await updateRecord("Customers", customerId, {
    "Gmail Token": JSON.stringify(updatedToken),
  });

  return updatedToken;
}

// Refresh an Outlook token
async function refreshOutlookToken(customerId, tokenData) {
  const parsed = typeof tokenData === "string" ? JSON.parse(tokenData) : tokenData;

  if (!parsed.refresh_token) {
    throw new Error("No refresh_token found in Outlook token data");
  }

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET,
      refresh_token: parsed.refresh_token,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Mail.Read offline_access",
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Outlook token refresh failed: ${data.error} — ${data.error_description}`);
  }

  const updatedToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || parsed.refresh_token,
    obtained_at: new Date().toISOString(),
    expires_in: data.expires_in,
    provider: "outlook",
  };

  await updateRecord("Customers", customerId, {
    "Outlook Token": JSON.stringify(updatedToken),
  });

  return updatedToken;
}

// Check if a token is expired (with 5 minute buffer)
function isTokenExpired(tokenData) {
  const parsed = typeof tokenData === "string" ? JSON.parse(tokenData) : tokenData;
  if (!parsed.obtained_at || !parsed.expires_in) return true;
  const obtainedAt = new Date(parsed.obtained_at).getTime();
  const expiresIn = parsed.expires_in * 1000;
  const buffer = 5 * 60 * 1000; // 5 minutes
  return Date.now() > obtainedAt + expiresIn - buffer;
}

module.exports = {
  refreshGmailToken,
  refreshOutlookToken,
  isTokenExpired,
};
