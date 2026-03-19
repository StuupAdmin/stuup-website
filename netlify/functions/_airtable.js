// netlify/functions/_airtable.js
// Shared Airtable API helpers. Used by gmail-callback, outlook-callback, and easypost-webhook.
// NOT a public endpoint (files starting with _ are internal to Netlify Functions).
//
// ENVIRONMENT VARIABLES REQUIRED:
//   AIRTABLE_API_KEY  — Personal access token from airtable.com/account
//   AIRTABLE_BASE_ID  — Your base ID (starts with "app")

const fetch = require("node-fetch");

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
};

// Get a single record by ID from a table
async function getRecord(table, recordId) {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(table)}/${recordId}`, { headers });
  if (!res.ok) throw new Error(`Airtable getRecord failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Update a single record's fields
async function updateRecord(table, recordId, fields) {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(table)}/${recordId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable updateRecord failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// Find records matching a formula
async function findRecords(table, formula, maxRecords = 10) {
  const params = new URLSearchParams({
    filterByFormula: formula,
    maxRecords: String(maxRecords),
  });
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(table)}?${params}`, { headers });
  if (!res.ok) throw new Error(`Airtable findRecords failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.records;
}

// Find a single record matching a formula (returns first match or null)
async function findRecord(table, formula) {
  const records = await findRecords(table, formula, 1);
  return records.length > 0 ? records[0] : null;
}

// Find a store by checking if its Full Address matches a given address
async function findStoreByAddress(address) {
  if (!address) return null;
  // Normalize: lowercase, trim whitespace
  const normalized = address.toLowerCase().trim();
  const records = await findRecords("Stores", `LOWER({Full Address}) = "${normalized.replace(/"/g, '\\"')}"`, 1);
  return records.length > 0 ? records[0] : null;
}

// Create a record in a table
async function createRecord(table, fields) {
  const res = await fetch(`${BASE_URL}/${encodeURIComponent(table)}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable createRecord failed: ${res.status} ${await res.text()}`);
  return res.json();
}

module.exports = {
  getRecord,
  updateRecord,
  findRecords,
  findRecord,
  findStoreByAddress,
  createRecord,
};
