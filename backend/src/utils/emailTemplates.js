// src/utils/emailTemplates.js

function buildRfpInviteEmail({ rfp, vendor, items = [] }) {
  const title = rfp.title || "RFP";
  const summary = rfp.summary || "-";
  const budget =
    rfp.budget_cap != null
      ? `${rfp.budget_cap} ${rfp.currency_code || "USD"}`
      : "Not specified";
  const deadline = rfp.deadline_days
    ? `${rfp.deadline_days} days`
    : "Not specified";
  const paymentTerms = rfp.payment_terms || "-";
  const warranty =
    rfp.min_warranty_months != null
      ? `${rfp.min_warranty_months} months`
      : "Not specified";

  const lineItemsText =
    items.length === 0
      ? "  (No structured line items stored)\n"
      : items
          .map(
            (it, idx) =>
              `  ${idx + 1}. ${it.item_label} - ${it.spec_text || "-"} x ${
                it.quantity
              }`
          )
          .join("\n");

  const text = `
Hello ${vendor.name},

You are invited to submit a proposal for the following RFP:

Title: ${title}
Summary: ${summary}

Budget Cap: ${budget}
Deadline: ${deadline}
Payment Terms: ${paymentTerms}
Minimum Warranty: ${warranty}

Requested Items:
${lineItemsText}

Please reply to this email with your proposal details.

Regards,
AutoRFP.ai
`.trim();

  const htmlItems =
    items.length === 0
      ? `<p>(No structured line items stored)</p>`
      : `<ul>${items
          .map(
            (it) =>
              `<li><strong>${it.item_label}</strong> – ${it.spec_text || "-"} × ${it.quantity}</li>`
          )
          .join("")}</ul>`;

  const html = `
<p>Hello ${vendor.name},</p>

<p>You are invited to submit a proposal for the following RFP:</p>

<p>
  <strong>Title:</strong> ${title}<br/>
  <strong>Summary:</strong> ${summary}<br/>
  <strong>Budget Cap:</strong> ${budget}<br/>
  <strong>Deadline:</strong> ${deadline}<br/>
  <strong>Payment Terms:</strong> ${paymentTerms}<br/>
  <strong>Minimum Warranty:</strong> ${warranty}
</p>

<p><strong>Requested Items:</strong></p>
${htmlItems}

<p>Please reply to this email with your proposal details.</p>

<p>Regards,<br/>AutoRFP.ai</p>
`.trim();

  return {
    subject: `RFP: ${title}`,
    text,
    html,
  };
}

module.exports = {
  buildRfpInviteEmail,
};
