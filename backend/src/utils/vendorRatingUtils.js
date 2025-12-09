/**
 * Utility functions for updating vendor ratings based on proposal performance
 */

const getModels = require("./getModels");
const { databases } = require("../config/dbMap.json");

/**
 * Calculate vendor rating based on:
 * - Successful proposals / total proposals
 * - Average proposal score
 * - On-time delivery percentage
 * - Recent performance trend
 *
 * Rating Scale: 0-10
 * - 0-2: Poor (frequent rejections, low scores)
 * - 3-4: Below Average
 * - 5-6: Average
 * - 7-8: Good
 * - 9-10: Excellent
 */
function calculateVendorRating(stats) {
  let score = 0;

  // Success rate: 0-4 points (40% weight)
  if (stats.total_projects > 0) {
    const successRate = stats.successful_projects / stats.total_projects;
    score += successRate * 4;
  }

  // Average proposal score: 0-4 points (40% weight)
  if (stats.average_proposal_score !== null && stats.average_proposal_score !== undefined) {
    // Convert from 0-100 scale to 0-4 scale
    score += (stats.average_proposal_score / 100) * 4;
  }

  // On-time percentage: 0-2 points (20% weight)
  if (stats.on_time_percentage !== null && stats.on_time_percentage !== undefined) {
    score += (stats.on_time_percentage / 100) * 2;
  }

  return Math.round(score * 100) / 100; // Round to 2 decimals
}

/**
 * Update vendor stats after proposal is awarded
 * Called when a proposal is marked as "awarded"
 */
async function updateVendorOnAward(vendorId, proposalData) {
  const db = databases.RFP.DB_NAME;
  const { Vendors, Proposals } = getModels(db);

  try {
    const vendor = await Vendors.findOne({ where: { id: vendorId } });
    if (!vendor) return null;

    // Get all proposals for this vendor
    const allProposals = await Proposals.findAll({
      where: { vendor_id: vendorId },
      attributes: ["id", "status", "ai_score", "delivery_days"],
    });

    const totalProjects = allProposals.length;
    const successfulProjects = allProposals.filter(
      (p) => p.status === "awarded"
    ).length;

    // Calculate average proposal score from all proposals
    const scoresArray = allProposals
      .map((p) => p.ai_score)
      .filter((s) => s !== null && s !== undefined)
      .map((s) => parseFloat(s));

    const averageScore =
      scoresArray.length > 0
        ? scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length
        : null;

    // Calculate average delivery days
    const deliveryDaysArray = allProposals
      .map((p) => p.delivery_days)
      .filter((d) => d !== null && d !== undefined && d > 0);

    const averageDeliveryDays =
      deliveryDaysArray.length > 0
        ? Math.round(
            deliveryDaysArray.reduce((a, b) => a + b, 0) /
              deliveryDaysArray.length
          )
        : null;

    // Calculate on-time percentage (assuming 30 days is on-time by default)
    const onTimeCount = deliveryDaysArray.filter((d) => d <= 30).length;
    const onTimePercentage =
      deliveryDaysArray.length > 0
        ? Math.round((onTimeCount / deliveryDaysArray.length) * 100)
        : null;

    // Calculate new rating
    const newRating = calculateVendorRating({
      total_projects: totalProjects,
      successful_projects: successfulProjects,
      average_proposal_score: averageScore,
      on_time_percentage: onTimePercentage,
    });

    // Update vendor
    await vendor.update({
      rating: newRating,
      total_projects: totalProjects,
      successful_projects: successfulProjects,
      average_delivery_days: averageDeliveryDays,
      on_time_percentage: onTimePercentage,
      average_proposal_score: averageScore,
      last_awarded_at: new Date(),
    });

    console.log(
      `✅ Updated vendor "${vendor.name}" rating: ${newRating}/10 (${successfulProjects}/${totalProjects} awards)`
    );

    return {
      vendorId,
      oldRating: vendor.rating,
      newRating,
      successfulProjects,
      totalProjects,
    };
  } catch (error) {
    console.error(`❌ Error updating vendor rating for ${vendorId}:`, error);
    throw error;
  }
}

/**
 * Update vendor stats after proposal is rejected
 * Called when a proposal is marked as "rejected"
 */
async function updateVendorOnReject(vendorId) {
  const db = databases.RFP.DB_NAME;
  const { Vendors, Proposals } = getModels(db);

  try {
    const vendor = await Vendors.findOne({ where: { id: vendorId } });
    if (!vendor) return null;

    // Get all proposals for this vendor
    const allProposals = await Proposals.findAll({
      where: { vendor_id: vendorId },
      attributes: ["id", "status", "ai_score", "delivery_days"],
    });

    const totalProjects = allProposals.length;
    const successfulProjects = allProposals.filter(
      (p) => p.status === "awarded"
    ).length;
    const rejectionCount = allProposals.filter(
      (p) => p.status === "rejected"
    ).length;

    // Calculate average proposal score
    const scoresArray = allProposals
      .map((p) => p.ai_score)
      .filter((s) => s !== null && s !== undefined)
      .map((s) => parseFloat(s));

    const averageScore =
      scoresArray.length > 0
        ? scoresArray.reduce((a, b) => a + b, 0) / scoresArray.length
        : null;

    // Calculate average delivery days
    const deliveryDaysArray = allProposals
      .map((p) => p.delivery_days)
      .filter((d) => d !== null && d !== undefined && d > 0);

    const averageDeliveryDays =
      deliveryDaysArray.length > 0
        ? Math.round(
            deliveryDaysArray.reduce((a, b) => a + b, 0) /
              deliveryDaysArray.length
          )
        : null;

    // On-time percentage
    const onTimeCount = deliveryDaysArray.filter((d) => d <= 30).length;
    const onTimePercentage =
      deliveryDaysArray.length > 0
        ? Math.round((onTimeCount / deliveryDaysArray.length) * 100)
        : null;

    // Calculate new rating
    const newRating = calculateVendorRating({
      total_projects: totalProjects,
      successful_projects: successfulProjects,
      average_proposal_score: averageScore,
      on_time_percentage: onTimePercentage,
    });

    // Update vendor
    await vendor.update({
      rating: newRating,
      total_projects: totalProjects,
      successful_projects: successfulProjects,
      average_delivery_days: averageDeliveryDays,
      on_time_percentage: onTimePercentage,
      average_proposal_score: averageScore,
      rejection_count: rejectionCount,
    });

    console.log(
      `⚠️  Updated vendor "${vendor.name}" rating: ${newRating}/10 (${rejectionCount} rejections)`
    );

    return {
      vendorId,
      oldRating: vendor.rating,
      newRating,
      successfulProjects,
      totalProjects,
      rejectionCount,
    };
  } catch (error) {
    console.error(`❌ Error updating vendor rejection count for ${vendorId}:`, error);
    throw error;
  }
}

/**
 * Manually set vendor rating
 * Useful for manual adjustments or imports
 */
async function setVendorRating(vendorId, rating) {
  if (rating < 0 || rating > 10) {
    throw new Error("Vendor rating must be between 0 and 10");
  }

  const db = databases.RFP.DB_NAME;
  const { Vendors } = getModels(db);

  try {
    const vendor = await Vendors.findOne({ where: { id: vendorId } });
    if (!vendor) {
      return { error: "Vendor not found" };
    }

    const oldRating = vendor.rating;
    await vendor.update({ rating });

    console.log(
      `📊 Manually set vendor "${vendor.name}" rating: ${oldRating}/10 → ${rating}/10`
    );

    return {
      vendorId,
      oldRating,
      newRating: rating,
    };
  } catch (error) {
    console.error(`❌ Error setting vendor rating for ${vendorId}:`, error);
    throw error;
  }
}

/**
 * Get vendor rating summary for comparison/display
 */
async function getVendorRatingSummary(vendorId) {
  const db = databases.RFP.DB_NAME;
  const { Vendors, Proposals } = getModels(db);

  try {
    const vendor = await Vendors.findOne({ where: { id: vendorId } });
    if (!vendor) {
      return { error: "Vendor not found" };
    }

    const proposals = await Proposals.findAll({
      where: { vendor_id: vendorId },
      attributes: ["status", "ai_score", "delivery_days"],
    });

    return {
      vendorId,
      name: vendor.name,
      email: vendor.email,
      currentRating: vendor.rating,
      totalProposals: proposals.length,
      awardedCount: proposals.filter((p) => p.status === "awarded").length,
      rejectedCount: proposals.filter((p) => p.status === "rejected").length,
      pendingCount: proposals.filter((p) => p.status === "pending").length,
      averageProposalScore: vendor.average_proposal_score,
      averageDeliveryDays: vendor.average_delivery_days,
      onTimePercentage: vendor.on_time_percentage,
      lastAwardedAt: vendor.last_awarded_at,
    };
  } catch (error) {
    console.error(
      `❌ Error getting vendor rating summary for ${vendorId}:`,
      error
    );
    throw error;
  }
}


module.exports = {
  calculateVendorRating,
  updateVendorOnAward,
  updateVendorOnReject,
  setVendorRating,
  getVendorRatingSummary,
};

