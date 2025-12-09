const { Op } = require("sequelize");
const getModels = require("../utils/getModels");
const { databases } = require("../config/dbMap.json");

// -------------------- Create Vendors (bulk) --------------------

const createVendorService = async (vendors) => {
  const db = databases.RFP.DB_NAME;
  const { Vendors } = getModels(db);

  try {
    // Normalize emails to lowercase and dedupe
    const normalizedVendors = vendors.map((v) => ({
      ...v,
      email: v.email.toLowerCase(),
    }));

    const emails = [...new Set(normalizedVendors.map((v) => v.email))];

    // Check for existing vendors by email
    const existing = await Vendors.findAll({
      where: { email: { [Op.in]: emails } },
    });

    if (existing.length > 0) {
      const existingEmails = existing.map((v) => v.email);
      return {
        error: `Vendors with these emails already exist: ${existingEmails.join(
          ", "
        )}`,
      };
    }

    // Prepare payload
    const payload = normalizedVendors.map(({ name, email, rating, tags }) => ({
      name,
      email,
      rating: rating ?? null,
      tags: Array.isArray(tags) ? tags : [],
    }));

    // Bulk insert
    const created = await Vendors.bulkCreate(payload, { returning: true });

    // Normalized response (always array)
    return created.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      rating: vendor.rating,
      tags: vendor.tags || [],
      created_at: vendor.created_at,
    }));
  } catch (error) {
    // NOTE: you should also handle unique constraint errors here if DB has a unique index
    console.error(" Error in createVendorService:", error);
    throw error;
  }
};

// -------------------- List Vendors --------------------

const listVendorsService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { Vendors, sequelize } = getModels(db);

  try {
    const { search, min_rating, page = 1, limit = 20 } = data || {};

    // Sanitize pagination
    const pageNumRaw = Number(page);
    const limitNumRaw = Number(limit);

    const pageNum = pageNumRaw > 0 ? pageNumRaw : 1;
    const limitNum = limitNumRaw > 0 && limitNumRaw <= 100 ? limitNumRaw : 20; // cap at 100
    const offset = (pageNum - 1) * limitNum;

    const where = {};

    const trimmedSearch = typeof search === "string" ? search.trim() : "";

    if (trimmedSearch) {
      const likeOp =
        typeof sequelize.getDialect === "function" &&
        sequelize.getDialect() === "postgres"
          ? Op.iLike
          : Op.like;

      where[Op.or] = [
        { name: { [likeOp]: `%${trimmedSearch}%` } },
        { email: { [likeOp]: `%${trimmedSearch}%` } },
      ];
    }

    if (typeof min_rating === "number") {
      where.rating = { [Op.gte]: min_rating };
    }

    const { rows, count } = await Vendors.findAndCountAll({
      where,
      attributes: [
        "id",
        "name",
        "email",
        "rating",
        "tags",
        "created_at",
        "updated_at",
      ],
      order: [["created_at", "DESC"]],
      offset,
      limit: limitNum,
    });

    return {
      total: count,
      page: pageNum,
      limit: limitNum,
      vendors: rows.map((v) => ({
        id: v.id,
        name: v.name,
        email: v.email,
        rating: v.rating,
        tags: v.tags || [],
        created_at: v.created_at,
        updated_at: v.updated_at,
      })),
    };
  } catch (error) {
    console.error(" Error in listVendorsService:", error);
    throw error;
  }
};

// -------------------- Get Vendor By ID --------------------

const getVendorByIdService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { Vendors } = getModels(db);

  try {
    const { vendor_id } = data || {};

    if (!vendor_id) {
      return { error: "vendor_id is required" };
    }

    const vendor = await Vendors.findOne({
      where: { id: vendor_id },
      attributes: ["id", "name", "email", "rating", "tags", "created_at"],
    });

    if (!vendor) {
      return { error: "Vendor not found" };
    }

    return {
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      rating: vendor.rating,
      tags: vendor.tags || [],
      created_at: vendor.created_at,
    };
  } catch (error) {
    console.error(" Error in getVendorByIdService:", error);
    throw error;
  }
};

// -------------------- Update Vendor --------------------

const updateVendorService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { Vendors } = getModels(db);

  try {
    const { vendor_id } = data || {};

    if (!vendor_id) {
      return { error: "vendor_id is required" };
    }

    const vendor = await Vendors.findOne({
      where: { id: vendor_id },
    });

    if (!vendor) {
      return { error: "Vendor not found" };
    }

    let { name, email, rating, tags } = data;

    const updateData = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase();

      // Only check if email is actually changing
      if (normalizedEmail !== vendor.email) {
        const existing = await Vendors.findOne({
          where: {
            email: normalizedEmail,
            id: { [Op.ne]: vendor_id },
          },
        });

        if (existing) {
          return { error: "Another vendor already uses this email" };
        }

        updateData.email = normalizedEmail;
      }
    }

    if (rating !== undefined) {
      updateData.rating = rating;
    }

    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : [];
    }

    await vendor.update(updateData);

    return {
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      rating: vendor.rating,
      tags: vendor.tags || [],
    };
  } catch (error) {
    console.error(" Error in updateVendorService:", error);
    throw error;
  }
};

// -------------------- Delete Vendor --------------------

const deleteVendorService = async (data) => {
  const db = databases.RFP.DB_NAME;
  const { Vendors } = getModels(db);

  try {
    const { vendor_id } = data || {};

    if (!vendor_id) {
      return { error: "vendor_id is required" };
    }

    const deletedCount = await Vendors.destroy({
      where: { id: vendor_id },
    });

    if (!deletedCount) {
      return { error: "Vendor not found or already deleted" };
    }

    return { deleted: true };
  } catch (error) {
    console.error(" Error in deleteVendorService:", error);
    throw error;
  }
};

module.exports = {
  createVendorService,
  listVendorsService,
  getVendorByIdService,
  updateVendorService,
  deleteVendorService,
};
