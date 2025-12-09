const { DataTypes } = require("sequelize");
const { databases } = require("../config/dbMap.json");

module.exports = (sequelize) => {
  const table = databases.RFP.tables.PROPOSALS || "proposals";

  const Proposal = sequelize.define(
    "Proposal",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      rfp_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      vendor_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      email_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      total_price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      currency_code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "USD",
      },
      delivery_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      delivery_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      warranty_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      warranty_months: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      payment_terms: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      items_match: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      ai_score: {
        type: DataTypes.DECIMAL(5, 2), // 0–100.00
        allowNull: true,
      },
      ai_reasoning: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "pending", // 'pending','awarded','rejected','draft'
      },
      ai_parsed: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: table,
      timestamps: false,
      underscored: true,
    }
  );

  return Proposal;
};
