// src/utils/emailRouting.js

// Simple token generator – you can replace with nanoid if you want
function generateReplyToken(length = 12) {
  const allowed = /[a-zA-Z0-9]/; // regex for allowed chars
  let token = "";

  while (token.length < length) {
    const c = String.fromCharCode(
      Math.floor(Math.random() * 94) + 33 // printable ASCII range
    );
    if (allowed.test(c)) token += c;
  }

  return token;
}

/**
 * Build:
 *   user+rfp_<token>@gmail.com
 */
function buildRfpReplyTo({ baseEmail, replyToken }) {
  if (!baseEmail) throw new Error("buildRfpReplyTo: baseEmail is required");
  if (!replyToken) throw new Error("buildRfpReplyTo: replyToken is required");

  const [local, domain] = baseEmail.split("@");
  if (!local || !domain) {
    throw new Error(`buildRfpReplyTo: invalid baseEmail "${baseEmail}"`);
  }

  return `${local}+rfp_${replyToken}@${domain}`;
}

/**
 * Parse:
 *   user+rfp_<token>@gmail.com
 *
 * Returns { replyToken } or null.
 */
function parseRfpPlusAddress(address) {
  if (!address) return null;

  // Case-insensitive match for "+rfp_", but capture token with original case
  const match = address.match(/\+rfp_([^@]+)@/i);

  if (!match) return null;

  const replyToken = match[1]; // this preserves ORIGINAL CASE
  if (!replyToken) return null;

  return { replyToken };
}


module.exports = {
  generateReplyToken,
  buildRfpReplyTo,
  parseRfpPlusAddress,
};
