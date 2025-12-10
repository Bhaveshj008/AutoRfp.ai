const { Op } = require("sequelize");
const getModels = require("../utils/getModels");
const { databases } = require("../config/dbMap.json");
const {
  ensureAssociation,
  makeDynamicInclude,
} = require("../utils/dynamicAssociations");
const { parseProposalWithGroq } = require("../utils/groqClient");
const {
  updateVendorOnAward,
  updateVendorOnReject,
} = require("../utils/vendorRatingUtils");
const {
  sendRejectionEmail,
  sendProposalEmails,
} = require("../utils/emailSendingUtils");

/**
 * Parse proposals from inbound emails using AI
 * Creates new proposals or updates existing ones (upsert logic)
 */
async function processWithConcurrency(items, concurrency, handler) {
  let index = 0;

  async function worker() {
    while (true) {
      const current = index++;
      if (current >= items.length) break;
      const item = items[current];
      await handler(item); // handler should catch/log its own errors if needed
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
}

const parseProposalsService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { sequelize, Rfps, Emails, Vendors, Proposals, ProposalItems } =
    getModels(db);

  const { rfp_id } = data;

  // ---- Step 1: Load RFP (no transaction needed yet)
  const rfp = await Rfps.findOne({ where: { id: rfp_id } });
  if (!rfp) {
    return { error: "RFP not found" };
  }

  // ---- Step 2: Load inbound emails (ordered for determinism)
  const inboundEmails = await Emails.findAll({
    where: {
      rfp_id,
      direction: "inbound",
    },
    order: [["created_at", "ASC"]],
  });

  if (!inboundEmails.length) {
    return { error: "No inbound emails found for this RFP" };
  }

  const vendorIds = [
    ...new Set(inboundEmails.map((e) => e.vendor_id).filter(Boolean)),
  ];

  if (!vendorIds.length) {
    return { error: "No vendor-linked inbound emails for this RFP" };
  }

  // ---- Step 3: Load vendors once
  const vendors = await Vendors.findAll({
    where: { id: { [Op.in]: vendorIds } },
  });
  const vendorById = new Map(vendors.map((v) => [v.id, v]));

  // Filter emails to those that have a valid vendor
  const emailVendorPairs = inboundEmails
    .map((email) => {
      const vendor = vendorById.get(email.vendor_id);
      return vendor ? { email, vendor } : null;
    })
    .filter(Boolean);

  if (!emailVendorPairs.length) {
    return { error: "No valid vendors found for inbound emails" };
  }

  // ---- Step 4: Pick best email per vendor (e.g. latest by created_at)
  const bestEmailByVendorId = new Map();
  for (const { email, vendor } of emailVendorPairs) {
    const existing = bestEmailByVendorId.get(vendor.id);
    if (!existing || email.created_at > existing.email.created_at) {
      bestEmailByVendorId.set(vendor.id, { email, vendor });
    }
  }

  // ---- Step 5: Call Groq outside transaction (optionally with concurrency)
  const parsedByVendorId = new Map();

  const pairsToParse = Array.from(bestEmailByVendorId.values());

  await processWithConcurrency(pairsToParse, 5, async ({ email, vendor }) => {
    try {
      const parsed = await parseProposalWithGroq({
        rfp,
        email,
        vendor,
      });

      if (parsed) {
        parsedByVendorId.set(vendor.id, { email, vendor, parsed });
      }
    } catch (err) {
      console.error(
        ` Failed to parse proposal for vendor ${vendor.id} / email ${email.id}:`,
        err.message
      );
      // Just skip this vendor; don't throw, or one failure kills all
    }
  });

  if (!parsedByVendorId.size) {
    return { error: "No proposals could be parsed from inbound emails" };
  }

  // ---- Step 6: Short transaction for DB writes only
  const t = await sequelize.transaction();
  try {
    const parsedVendorIds = Array.from(parsedByVendorId.keys());

    // Load existing proposals for these vendors in one go
    const existingProposals = await Proposals.findAll({
      where: {
        rfp_id,
        vendor_id: { [Op.in]: parsedVendorIds },
      },
      transaction: t,
    });

    const proposalByVendorId = new Map(
      existingProposals.map((p) => [p.vendor_id, p])
    );

    const createdProposals = [];
    const updatedProposals = [];

    for (const vendorId of parsedVendorIds) {
      const { email, vendor, parsed } = parsedByVendorId.get(vendorId);

      const baseFields = {
        email_id: email.id,
        total_price: parsed.total_price || null,
        currency_code: parsed.currency_code || rfp.currency_code || "USD",
        delivery_text: parsed.delivery_text || null,
        delivery_days: parsed.delivery_days || null,
        warranty_text: parsed.warranty_text || null,
        warranty_months: parsed.warranty_months || null,
        payment_terms: parsed.payment_terms || null,
        items_match:
          typeof parsed.items_match === "boolean" ? parsed.items_match : null,
        ai_score: parsed.ai_score || null,
        ai_reasoning: parsed.ai_reasoning || null,
        ai_parsed: parsed,
      };

      let proposal = proposalByVendorId.get(vendorId);

      if (proposal) {
        // UPDATE existing proposal
        console.log(
          `[INFO] Updating existing proposal for vendor ${vendor.name}`
        );

        await proposal.update(baseFields, { transaction: t });

        // Replace items
        await ProposalItems.destroy({
          where: { proposal_id: proposal.id },
          transaction: t,
        });

        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          const itemsToInsert = parsed.items.map((item) => ({
            proposal_id: proposal.id,
            item_label: item.label || null,
            spec_text: item.spec || null,
            quantity: item.quantity || null,
            unit_price: item.unit_price || null,
            total_price: item.total_price || null,
            matches_rfp:
              typeof item.matches_rfp === "boolean"
                ? item.matches_rfp
                : null,
            notes: item.notes || null,
          }));

          await ProposalItems.bulkCreate(itemsToInsert, { transaction: t });
        }

        updatedProposals.push(proposal);
      } else {
        // CREATE new proposal
        console.log(
          `[INFO] Creating new proposal for vendor ${vendor.name}`
        );

        proposal = await Proposals.create(
          {
            rfp_id,
            vendor_id: vendor.id,
            version: 1,
            status: "pending",
            ...baseFields,
          },
          { transaction: t }
        );

        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          const itemsToInsert = parsed.items.map((item) => ({
            proposal_id: proposal.id,
            item_label: item.label || null,
            spec_text: item.spec || null,
            quantity: item.quantity || null,
            unit_price: item.unit_price || null,
            total_price: item.total_price || null,
            matches_rfp:
              typeof item.matches_rfp === "boolean"
                ? item.matches_rfp
                : null,
            notes: item.notes || null,
          }));

          await ProposalItems.bulkCreate(itemsToInsert, { transaction: t });
        }

        createdProposals.push(proposal);
      }
    }

    if (
      (createdProposals.length > 0 || updatedProposals.length > 0) &&
      rfp.status !== "closed"
    ) {
      await rfp.update({ status: "evaluating" }, { transaction: t });
    }

    await t.commit();

    const allProposals = [...createdProposals, ...updatedProposals];

    console.log(
      `[INFO] Parse Summary: ${createdProposals.length} created, ${updatedProposals.length} updated`
    );

    return allProposals.map((p) => ({
      proposal_id: p.id,
      rfp_id: p.rfp_id,
      vendor_id: p.vendor_id,
      version: p.version,
      total_price: p.total_price,
      currency_code: p.currency_code,
      delivery_text: p.delivery_text,
      warranty_text: p.warranty_text,
      payment_terms: p.payment_terms,
      items_match: p.items_match,
      ai_score: p.ai_score,
      status: p.status,
    }));
  } catch (error) {
    await t.rollback();
    console.error(" Error in parseProposalsService:", error);
    throw error;
  }
};


// -------------------- Shared Helper: bounded concurrency --------------------

async function processWithConcurrency(items, concurrency, handler) {
  let index = 0;

  async function worker() {
    while (true) {
      const current = index++;
      if (current >= items.length) break;

      const item = items[current];
      try {
        await handler(item);
      } catch (err) {
        console.error("Error in concurrency worker:", err);
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(
    Array.from({ length: workerCount }, () => worker())
  );
}

// -------------------- Award Proposal --------------------

/**
 * Award a proposal to a vendor
 * Auto-rejects all other proposals and sends emails asynchronously
 */
const awardProposalService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { sequelize, Proposals, Rfps, Vendors } = getModels(db);

  const requestId = `AWARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // Request tracing

  const t = await sequelize.transaction();
  try {
    const { rfp_id, vendor_id } = data;

    const rfp = await Rfps.findOne({ where: { id: rfp_id }, transaction: t });
    if (!rfp) {
      await t.rollback();
      return { error: "RFP not found" };
    }

    if (rfp.status === "closed") {
      await t.rollback();
      return { error: "RFP is already closed" };
    }

    const targetProposal = await Proposals.findOne({
      where: { rfp_id, vendor_id },
      transaction: t,
    });

    if (!targetProposal) {
      await t.rollback();
      return { error: "Proposal not found for given RFP and vendor" };
    }

    if (targetProposal.status === "awarded") {
      await t.rollback();
      return { error: "Proposal is already awarded" };
    }

    const vendor = await Vendors.findOne({
      where: { id: vendor_id },
      transaction: t,
    });

    // Collect proposals that will be rejected *in this call* (avoid re-sending)
    const otherProposalsToReject = await Proposals.findAll({
      where: {
        rfp_id,
        vendor_id: { [Op.ne]: vendor_id },
        status: { [Op.ne]: "rejected" }, // don't re-touch already rejected
      },
      transaction: t,
    });

    const rejectedProposalIds = otherProposalsToReject.map((p) => p.id);
    const rejectedVendorIds = [
      ...new Set(
        otherProposalsToReject
          .map((p) => p.vendor_id)
          .filter(Boolean)
      ),
    ];

    // Update winning proposal
    await targetProposal.update(
      { status: "awarded" },
      { transaction: t }
    );

    // Update others to rejected
    if (rejectedProposalIds.length > 0) {
      await Proposals.update(
        { status: "rejected" },
        {
          where: { id: { [Op.in]: rejectedProposalIds } },
          transaction: t,
        }
      );
    }

    // Close RFP
    if (rfp.status !== "closed") {
      await rfp.update({ status: "closed" }, { transaction: t });
    }

    await t.commit();

    // --------- Update vendor rating after award ---------
    setImmediate(async () => {
      try {
        await updateVendorOnAward(vendor_id, targetProposal);
      } catch (err) {
        console.error(" Error updating vendor rating on award:", err.message);
      }
    });

    // --------- Async emails after commit (award + auto-rejections) ---------
    // Simple high-level API - all complexity hidden in emailSendingUtils

    if (rejectedVendorIds.length > 0) {
      setImmediate(async () => {
        try {
          // Load vendors for rejection
          const rejectedVendors = await Vendors.findAll({
            where: { id: { [Op.in]: rejectedVendorIds } },
          });

          // Single call sends award email + all rejection emails with internal concurrency
          const emailResult = await sendProposalEmails({
            awardVendor: vendor,        // Award email to winning vendor
            rejectVendors: rejectedVendors, // Auto-reject other vendors
            rfp,
            requestId,
          });

          console.log(
            `[${requestId}] Proposal emails sent: award=${emailResult.award.sent}, rejections=${emailResult.rejections.completed}/${emailResult.rejections.total}`
          );
        } catch (err) {
          console.error(" Error sending rejection emails:", err.message);
        }
      });
    }

    return {
      rfp_id,
      vendor_id,
      awarded_proposal_id: targetProposal.id,
    };
  } catch (error) {
    await t.rollback();
    console.error(" Error in awardProposalService:", error);
    throw error;
  }
};

// -------------------- Reject Proposal --------------------

/**
 * Manually reject a proposal and send rejection email
 */
const rejectProposalService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { Proposals, Vendors, Rfps } = getModels(db);

  try {
    const { rfp_id, vendor_id } = data;

    const proposal = await Proposals.findOne({
      where: { rfp_id, vendor_id },
    });

    if (!proposal) {
      return { error: "Proposal not found for given RFP and vendor" };
    }

    // Guard: don't allow rejecting an awarded proposal
    if (proposal.status === "awarded") {
      return { error: "Cannot reject an already awarded proposal" };
    }

    const [vendor, rfp] = await Promise.all([
      Vendors.findOne({ where: { id: vendor_id } }),
      Rfps.findOne({ where: { id: rfp_id } }),
    ]);

    await proposal.update({ status: "rejected" });

    // --------- Update vendor rejection count ---------
    setImmediate(async () => {
      try {
        await updateVendorOnReject(vendor_id);
      } catch (err) {
        console.error(" Error updating vendor rating on reject:", err.message);
      }
    });

    // Send rejection email asynchronously (non-blocking)
    if (vendor && vendor.email && rfp) {
      setImmediate(async () => {
        try {
          await sendRejectionEmail({
            vendor,
            rfp,
            type: "manual-reject",
          });
        } catch (err) {
          console.error(
            ` Failed to send rejection email to ${vendor.email}:`,
            err.message
          );
        }
      });
    }

    return {
      rfp_id,
      vendor_id,
      proposal_id: proposal.id,
      status: "rejected",
    };
  } catch (error) {
    console.error(" Error in rejectProposalService:", error);
    throw error;
  }
};

/**
 * List all proposals for an RFP with pagination and proposal items
 */
const listProposalsService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { sequelize, Proposals, ProposalItems, Vendors } = getModels(db);

  try {
    const { rfp_id, page = 1, limit = 20 } = data;

    if (!rfp_id) {
      return { error: "rfp_id is required" };
    }

    // Basic sanitisation + cap
    const pageNumRaw = Number(page);
    const limitNumRaw = Number(limit);
    const pageNum = pageNumRaw > 0 ? pageNumRaw : 1;
    const limitNum =
      limitNumRaw > 0 && limitNumRaw <= 100 ? limitNumRaw : 20; // cap at 100, tune if needed
    const offset = (pageNum - 1) * limitNum;

    // Ensure vendor association
    ensureAssociation(sequelize, {
      from: Proposals,
      to: Vendors,
      as: "vendor",
      type: "belongsTo",
      foreignKey: "vendor_id",
    });

    const { rows, count } = await Proposals.findAndCountAll({
      where: { rfp_id },
      attributes: [
        "id",
        "rfp_id",
        "vendor_id",
        "version",
        "total_price",
        "currency_code",
        "delivery_days",
        "warranty_text",
        "payment_terms",
        "status",
        "ai_score",
        "ai_reasoning",
        "created_at",
        "updated_at",
      ],
      include: [
        makeDynamicInclude(sequelize, {
          from: Proposals,
          to: Vendors,
          as: "vendor",
          type: "belongsTo",
          attributes: ["id", "name", "email"],
        }),
      ],
      order: [["created_at", "DESC"]],
      offset,
      limit: limitNum,
    });

    if (!rows.length) {
      return {
        page: pageNum,
        limit: limitNum,
        total: 0,
        total_pages: 1,
        proposals: [],
      };
    }

    // ---- Bulk-load all items for proposals in this page (avoid N+1) ----
    const proposalIds = rows.map((p) => p.id);

    const allItems = await ProposalItems.findAll({
      where: { proposal_id: { [Op.in]: proposalIds } },
      attributes: [
        "id",
        "proposal_id",
        "item_label",
        "spec_text",
        "unit_price",
        "quantity",
      ],
      order: [["created_at", "ASC"]],
    });

    const itemsByProposalId = new Map();
    for (const item of allItems) {
      const pid = item.proposal_id;
      if (!itemsByProposalId.has(pid)) {
        itemsByProposalId.set(pid, []);
      }
      itemsByProposalId.get(pid).push(item);
    }

    // ---- Build final response objects ----
    const proposalsWithItems = rows.map((proposal) => {
      const items = itemsByProposalId.get(proposal.id) || [];

      return {
        id: proposal.id,
        rfp_id: proposal.rfp_id,
        vendor_id: proposal.vendor_id,
        vendor: proposal.vendor
          ? {
              id: proposal.vendor.id,
              name: proposal.vendor.name,
              email: proposal.vendor.email,
            }
          : null,
        version: proposal.version,
        total_price: proposal.total_price,
        currency_code: proposal.currency_code,
        delivery_days: proposal.delivery_days,
        warranty_text: proposal.warranty_text,
        payment_terms: proposal.payment_terms,
        status: proposal.status,
        ai_score: proposal.ai_score,
        ai_reasoning: proposal.ai_reasoning,
        items: items.map((item) => ({
          id: item.id,
          item_name: item.item_label,
          specs: item.spec_text,
          price: item.unit_price,
          quantity: item.quantity,
        })),
        created_at: proposal.created_at,
        updated_at: proposal.updated_at,
      };
    });

    const totalPages = Math.max(1, Math.ceil(count / limitNum));

    return {
      page: pageNum,
      limit: limitNum,
      total: count,
      total_pages: totalPages,
      proposals: proposalsWithItems,
    };
  } catch (error) {
    console.error(" Error in listProposalsService:", error);
    throw error;
  }
};
module.exports = {
  parseProposalsService,
  awardProposalService,
  rejectProposalService,
  listProposalsService,
};
