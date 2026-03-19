// netlify/functions/outlook-auth.js
// STEP 1 OF OUTLOOK OAUTH
// The Customer App opens: https://stuup.co/connect/outlook?customer_id=[airtable_record_id]
// This function builds the Microsoft OAuth URL and redirects the customer there.
//
// ENVIRONMENT VARIABLES REQUIRED:
//   MICROSOFT_CLIENT_ID  — from Azure > App registrations
//   SITE_URL             — https://stuup.co (no trailing slash)

exports.handler = async (event) => {
  const customerId = event.queryStringParameters?.customer_id;

  if (!customerId) {
    return {
      statusCode: 400,
      body: "Missing customer_id parameter",
    };
  }

  const state = Buffer.from(JSON.stringify({ customer_id: customerId })).toString("base64");

  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID,
    redirect_uri: `${process.env.SITE_URL}/.netlify/functions/outlook-callback`,
    response_type: "code",
    scope: "https://graph.microsoft.com/Mail.Read offline_access",
    state,
    response_mode: "query",
  });

  return {
    statusCode: 302,
    headers: {
      Location: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`,
    },
    body: "",
  };
};
