// netlify/functions/outlook-callback.js
// STEP 2 OF OUTLOOK OAUTH
// Microsoft redirects the customer here after they approve access.
// URL: https://stuup.co/.netlify/functions/outlook-callback?code=...&state=...
//
// ENVIRONMENT VARIABLES REQUIRED:
//   MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET  — from Azure
//   SITE_URL  — https://stuup.co
//   APP_URL   — https://app.stuup.co

const fetch = require("node-fetch");
const { updateRecord } = require("./_airtable");

exports.handler = async (event) => {
  const { code, state, error } = event.queryStringParameters || {};
  const APP_URL = process.env.APP_URL;

  if (error) {
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?email_connect=denied` },
      body: "",
    };
  }

  const { customer_id: customerId } = JSON.parse(
    Buffer.from(state, "base64").toString("utf8")
  );

  const tokenRes = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        redirect_uri: `${process.env.SITE_URL}/.netlify/functions/outlook-callback`,
        grant_type: "authorization_code",
        scope: "https://graph.microsoft.com/Mail.Read offline_access",
      }),
    }
  );

  const data = await tokenRes.json();

  if (data.error) {
    console.error("Outlook token exchange failed:", data.error, data.error_description);
    return {
      statusCode: 302,
      headers: { Location: `${APP_URL}?email_connect=error` },
      body: "",
    };
  }

  await updateRecord("Customers", customerId, {
    "Outlook Token": JSON.stringify({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      obtained_at: new Date().toISOString(),
      expires_in: data.expires_in,
      provider: "outlook",
    }),
    "Email Connected": true,
  });

  return {
    statusCode: 302,
    headers: { Location: `${APP_URL}?email_connect=success` },
    body: "",
  };
};
