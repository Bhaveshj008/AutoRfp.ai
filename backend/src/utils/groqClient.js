const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
const GROQ_BASE_URL =
  process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

if (!GROQ_API_KEY) {
  console.warn("⚠️ GROQ_API_KEY is missing. AI calls will fail.");
}

// -------------------- Low-level caller --------------------

async function callGroqRaw(prompt) {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");

  try {
    const response = await axios.post(
      `${GROQ_BASE_URL}/chat/completions`,
      {
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 512,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 30000,
        validateStatus: (s) => s >= 200 && s < 300,
      }
    );

    const text = response?.data?.choices?.[0]?.message?.content?.trim() || null;

    if (!text) throw new Error("Groq returned empty content");

    return text;
  } catch (err) {
    if (err.response) {
      throw new Error(
        `Groq API error ${err.response.status}: ${JSON.stringify(
          err.response.data
        ).slice(0, 1000)}`
      );
    }
    throw new Error(`Groq request failed: ${err.message}`);
  }
}

// -------------------- Safe JSON Extraction --------------------

function safeJsonParse(text) {
  if (typeof text !== "string") throw new Error("Expected text");

  // Raw JSON
  try {
    return JSON.parse(text.trim());
  } catch (_) {}

  // ```json blocks
  const match = text.match(/```json([\s\S]*?)```/i);
  if (match) {
    try {
      return JSON.parse(match[1].trim());
    } catch (_) {}
  }

  // Extract {...}
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s !== -1 && e > s) {
    try {
      return JSON.parse(text.slice(s, e + 1));
    } catch (_) {}
  }

  throw new Error("Groq JSON parsing failed");
}

// -------------------- Normalization Helpers --------------------

const coerceNumberOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const coerceIntOrNull = (v) => {
  const n = coerceNumberOrNull(v);
  return n === null ? null : Math.round(n);
};

const coerceBooleanOrNull = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const x = v.trim().toLowerCase();
    if (["true", "yes", "1"].includes(x)) return true;
    if (["false", "no", "0"].includes(x)) return false;
  }
  return null;
};

const normalizeCurrencyCode = (c) => {
  if (!c || typeof c !== "string") return "USD";
  const u = c.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(u) ? u : "USD";
};

const clampScore = (s) => {
  const n = coerceNumberOrNull(s);
  if (n === null) return null;
  return Math.min(100, Math.max(0, n));
};

// -------------------- RFP Normalizer --------------------

function normalizeRfpAnalysisOutput(raw) {
  const items = Array.isArray(raw.items) ? raw.items : [];
  const normalizedItems = items
    .map((i) => ({
      label: i?.label || null,
      specs: i?.specs || null,
      quantity: coerceIntOrNull(i?.quantity) || 1,
    }))
    .filter((i) => i.label);

  if (!normalizedItems.length) throw new Error("No items extracted");

  return {
    title: raw.title || "Untitled RFP",
    summary: raw.summary || null,
    budget_cap: coerceNumberOrNull(raw.budget_cap),
    currency_code: normalizeCurrencyCode(raw.currency_code),
    deadline_days: coerceIntOrNull(raw.deadline_days),
    payment_terms: raw.payment_terms || null,
    min_warranty_months: coerceIntOrNull(raw.min_warranty_months),
    items: normalizedItems,
  };
}

// -------------------- Proposal Normalizer --------------------

function normalizeProposalOutput(raw) {
  const items = Array.isArray(raw.items) ? raw.items : [];

  const normalizedItems = items
    .map((i) => ({
      label: i?.label || null,
      spec: i?.spec || null,
      quantity: coerceIntOrNull(i?.quantity) || 1,
      unit_price: coerceNumberOrNull(i?.unit_price),
      total_price: coerceNumberOrNull(i?.total_price),
      matches_rfp: coerceBooleanOrNull(i?.matches_rfp) ?? true,
      notes: i?.notes || null,
    }))
    .filter((i) => i.label);

  return {
    total_price: coerceNumberOrNull(raw.total_price),
    currency_code: normalizeCurrencyCode(raw.currency_code),
    delivery_text: raw.delivery_text || null,
    delivery_days: coerceIntOrNull(raw.delivery_days),
    warranty_text: raw.warranty_text || null,
    warranty_months: coerceIntOrNull(raw.warranty_months),
    payment_terms: raw.payment_terms || null,
    items_match:
      coerceBooleanOrNull(raw.items_match) ??
      (normalizedItems.length
        ? normalizedItems.every((i) => i.matches_rfp)
        : null),
    ai_score: clampScore(raw.ai_score),
    ai_reasoning: raw.ai_reasoning || "",
    items: normalizedItems,
  };
}

// -------------------- System Instructions --------------------

const RFP_SYSTEM_INSTRUCTION = `
Return ONLY this JSON (no extra text):

{
  "title": string,
  "summary": string,
  "budget_cap": number|null,
  "currency_code": string|null,
  "deadline_days": integer|null,
  "payment_terms": string|null,
  "min_warranty_months": integer| 12 months if not given,
  "items": [
    { "label": string, "specs": string(extract from prompt), "quantity": integer }
  ]
}

Rules:
- No guessing. If not stated → null.
- Items: non-empty, one per item type with quantity.
- Specs: only what user wrote.
- Budget words: "lakh / lac"=100000, "crore / cr"=10000000.
- Currency: Rs/₹/INR→"INR", $/USD→"USD", else null.
- Deadline: TODAY={{TODAY}}.
  • If user says "X days" → use X.
  • If user gives a date → convert to YYYY-MM-DD and output exact days difference from TODAY.
- Payment_terms: copy text.
- Warranty: convert years to months, else null.
`;

async function analyzeRfpWithGroq(prompt) {
  const today = new Date().toISOString().slice(0, 10); // e.g. "2025-12-08"
  const sys = RFP_SYSTEM_INSTRUCTION.replace("{{TODAY}}", today);

  const full = `${sys}\n\nUSER_INPUT:\n${prompt}`;
  const raw = await callGroqRaw(full);
  const parsed = safeJsonParse(raw);
  return normalizeRfpAnalysisOutput(parsed);
}

const PROPOSAL_SYSTEM_INSTRUCTION = `
Return ONLY one JSON:
{total_price,currency_code,delivery_text,delivery_days,warranty_text,
warranty_months,payment_terms,items_match,ai_score,ai_reasoning,
items:[{label,spec,quantity,unit_price,total_price,matches_rfp,notes}]}.

Rules:
- Compare EMAIL_JSON vs RFP_JSON.
- total_price = realistic sum.
- matches_rfp: yes/partial/no based on quantity+spec.

Scoring (0–100) MUST be **relative**, not absolute:
- Start at 100 for a perfect theoretical match.
- Subtract penalties:
  * price_penalty = ((total_price - RFP_JSON.best_price) / RFP_JSON.best_price) * 30.
  * delivery_penalty = (delivery_days - RFP_JSON.best_delivery_days) * 1.0.
  * spec_penalty = 10 if specs unclear or weaker.
  * missing_items_penalty = 20 if any RFP item missing.
  * vague_email_penalty = 40 if no quantities/prices.

Hard caps:
- price > budget_cap * 1.2 → score<=50.
- missing key items → score<=60.

Important:
- **Vendors with worse pricing MUST get lower scores.**
- **Vendors with slower delivery MUST get lower scores.**
- Do NOT cluster scores.
- JSON only.
`;


async function parseProposalWithGroq({ rfp, email, vendor }) {
  let items = [];
  try {
    let x = rfp.ai_structured;
    if (typeof x === "string") x = JSON.parse(x);
    if (x?.items) items = x.items;
  } catch (_) {}

  const prompt =
    PROPOSAL_SYSTEM_INSTRUCTION +
    "\nRFP_JSON:\n" +
    JSON.stringify({ ...rfp, items }) +
    "\nVENDOR_JSON:\n" +
    JSON.stringify(vendor) +
    "\nEMAIL_JSON:\n" +
    JSON.stringify(email);
  console.log(prompt);
  console.log(GROQ_MODEL);
  const raw = await callGroqRaw(prompt);
  const parsed = safeJsonParse(raw);
  return normalizeProposalOutput(parsed);
}

module.exports = {
  analyzeRfpWithGroq,
  parseProposalWithGroq,
};
