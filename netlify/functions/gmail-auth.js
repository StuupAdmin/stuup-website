// netlify/functions/gmail-auth.js
// STEP 1 OF GMAIL OAUTH
// The Customer App opens: https://stuup.co/connect/gmail?customer_id=[airtable_record_id]
// This function builds the Google OAuth URL and redirects the customer there.
//
// ENVIRONMENT VARIABLES REQUIRED:
//   GOOGLE_CLIENT_ID  — from Google Cloud Console > Credentials
//   SITE_URL          — https://stuup.co (no trailing slash)

exports.handler = async (event) => {
  const customerId = event.queryStringParameters?.customer_id;

  if (!customerId) {
    return {
      statusCode: 400,
      body: "Missing customer_id parameter",
    };
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const SITE_URL = process.env.SITE_URL || "https://stuup.co";
  const REDIRECT_URI = `${SITE_URL}/.netlify/functions/gmail-callback`;

  // Embed customer_id in the OAuth "state" parameter.
  // Google echoes this back to the callback so we know which customer to update.
  const state = Buffer.from(JSON.stringify({ customer_id: customerId })).toString("base64");

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return {
    statusCode: 302,
    headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` },
    body: "",
  };
};
