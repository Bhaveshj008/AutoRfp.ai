const { Op } = require("sequelize");
const getModels = require("../utils/getModels");
const { databases } = require("../config/dbMap.json");
const {
  ensureAssociation,
  makeDynamicInclude,
} = require("../utils/dynamicAssociations");

const { analyzeRfpWithGroq } = require("../utils/groqClient");

// -------------------- Preview: AI-only, no DB --------------------

const analyzeRfpPreviewService = async (data) => {
  try {
    const { prompt } = data;

    if (!prompt || typeof prompt !== "string") {
      return { error: "Prompt is required" };
    }

    const structured = await analyzeRfpWithGroq(prompt);

    if (!structured || !structured.title) {
      return { error: "Failed to analyze RFP with AI" };
    }

    return { structured };
  } catch (error) {
    console.error(" Error in analyzeRfpPreviewService:", error);
    throw error;
  }
};

// -------------------- Create RFP --------------------

const createRfpService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { sequelize, Rfps, RfpItems } = getModels(db);

  // Basic validation BEFORE transaction
  const { prompt, structured } = data || {};

  if (!prompt || typeof prompt !== "string") {
    return { error: "Prompt is required" };
  }
  if (!structured || typeof structured !== "object") {
    return { error: "Structured RFP payload is required" };
  }
  if (!structured.title) {
    return { error: "RFP title is required" };
  }

  const t = await sequelize.transaction();
  try {
    // Extract normalized fields
    const {
      title,
      summary,
      budgetCap,
      budget_cap,
      currency,
      currency_code,
      deadlineDays,
      deadline_days,
      payment_terms,
      min_warranty_months,
      items = [],
    } = structured;

    const rfp = await Rfps.create(
      {
        title,
        summary: summary || null,
        raw_prompt: prompt,

        budget_cap: budgetCap ?? budget_cap ?? null,
        currency_code: currency || currency_code || "USD",

        deadline_days: deadlineDays ?? deadline_days ?? null,
        payment_terms: payment_terms || null,

        min_warranty_months: min_warranty_months || null,
        status: "draft",
      },
      { transaction: t }
    );

    // Build items array and bulk insert once
    const itemsToInsert = [];
    let sort = 1;

    for (const it of items) {
      const label = it.item || it.label || null;
      const specs = it.specs || it.spec || null;
      const qty =
        it.quantity != null
          ? Number(it.quantity)
          : it.qty != null
          ? Number(it.qty)
          : null;

      // Skip invalid
      if (!label || !qty) continue;

      itemsToInsert.push({
        rfp_id: rfp.id,
        item_label: label,
        spec_text: specs,
        quantity: qty,
        sort_order: sort++,
      });
    }

    if (itemsToInsert.length > 0) {
      await RfpItems.bulkCreate(itemsToInsert, { transaction: t });
    }

    await t.commit();

    return {
      rfp_id: rfp.id,
      message: "RFP created",
      structured,
    };
  } catch (error) {
    await t.rollback();
    console.error(" Error in createRfpService:", error);
    throw error;
  }
};

// -------------------- List RFPs --------------------

/**
 * List RFPs (with basic pagination + filters)
 */
const listRfpsService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { sequelize, Rfps } = getModels(db);

  try {
    const {
      page = 1,
      limit = 20,
      search, // optional: matches title/summary
      status, // optional: draft | sent | evaluating | closed
    } = data || {};

    const pageNumRaw = Number(page);
    const limitNumRaw = Number(limit);

    const pageNum = pageNumRaw > 0 ? pageNumRaw : 1;
    const limitNum =
      limitNumRaw > 0 && limitNumRaw <= 100 ? limitNumRaw : 20; // cap at 100
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    if (status) {
      where.status = status;
    }

    const trimmedSearch =
      typeof search === "string" ? search.trim() : "";

    if (trimmedSearch) {
      const likeOp =
        typeof sequelize.getDialect === "function" &&
        sequelize.getDialect() === "postgres"
          ? Op.iLike
          : Op.like;

      where[Op.or] = [
        { title: { [likeOp]: `%${trimmedSearch}%` } },
        { summary: { [likeOp]: `%${trimmedSearch}%` } },
      ];
    }

    const { rows, count } = await Rfps.findAndCountAll({
      where,
      attributes: [
        "id",
        "title",
        "summary",
        "budget_cap",
        "currency_code",
        "deadline_days",
        "payment_terms",
        "min_warranty_months",
        "status",
        "created_at",
        "updated_at",
      ],
      order: [["created_at", "DESC"]],
      offset,
      limit: limitNum,
    });

    const totalPages = Math.max(1, Math.ceil(count / limitNum));

    return {
      page: pageNum,
      limit: limitNum,
      total: count,
      total_pages: totalPages,
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        budget_cap: r.budget_cap,
        currency_code: r.currency_code,
        deadline_days: r.deadline_days,
        payment_terms: r.payment_terms,
        min_warranty_months: r.min_warranty_months,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };
  } catch (error) {
    console.error(" Error in listRfpsService:", error);
    throw error;
  }
};

// -------------------- Get RFP Details --------------------

/**
 * Get RFP Details (currently header-only; comment mentions items but not implemented)
 */
const getRfpDetailsService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { Rfps } = getModels(db);

  try {
    const { rfp_id } = data || {};

    if (!rfp_id) {
      return { error: "rfp_id is required" };
    }

    const rfp = await Rfps.findOne({
      where: { id: rfp_id },
      attributes: [
        "id",
        "title",
        "summary",
        "raw_prompt",
        "budget_cap",
        "currency_code",
        "deadline_days",
        "payment_terms",
        "min_warranty_months",
        "status",
        "created_at",
        "updated_at",
      ],
    });

    if (!rfp) {
      return { error: "RFP not found" };
    }

    return {
      rfp: {
        id: rfp.id,
        title: rfp.title,
        summary: rfp.summary,
        raw_prompt: rfp.raw_prompt,
        budget_cap: rfp.budget_cap,
        currency_code: rfp.currency_code,
        deadline_days: rfp.deadline_days,
        payment_terms: rfp.payment_terms,
        min_warranty_months: rfp.min_warranty_months,
        status: rfp.status,
        created_at: rfp.created_at,
        updated_at: rfp.updated_at,
      },
    };
  } catch (error) {
    console.error(" Error in getRfpDetailsService:", error);
    throw error;
  }
};

module.exports = {
  analyzeRfpPreviewService,
  createRfpService,
  listRfpsService,
  getRfpDetailsService,
};
