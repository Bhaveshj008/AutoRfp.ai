const { DataTypes } = require("sequelize");
const { databases } = require("../config/dbMap.json");

module.exports = (sequelize) => {
  const table = databases.RFP.tables.RFPS || "rfps";

  const Rfp = sequelize.define(
    "Rfp",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      title: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      raw_prompt: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      budget_cap: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      currency_code: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "USD",
      },
      deadline_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      payment_terms: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      min_warranty_months: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "draft",
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: table,
      timestamps: false,       // DB manages timestamps manually
      underscored: true,
    }
  );

  return Rfp;
};
