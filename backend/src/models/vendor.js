const { DataTypes } = require("sequelize");
const { databases } = require("../config/dbMap.json");

module.exports = (sequelize) => {
  const table = databases.RFP.tables.VENDORS || "vendors";

  const Vendor = sequelize.define(
    "Vendor",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      email: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
      rating: {
        type: DataTypes.DECIMAL(4, 2), // 0–10.00 (0-10 scale)
        allowNull: false,
        defaultValue: 0,
      },
      total_projects: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      successful_projects: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      average_delivery_days: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      on_time_percentage: {
        type: DataTypes.DECIMAL(5, 2), // 0-100
        allowNull: true,
      },
      average_proposal_score: {
        type: DataTypes.DECIMAL(5, 2), // 0-100
        allowNull: true,
      },
      rejection_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_awarded_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      tags: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: [],
      },
      // created_at / updated_at exist in DB, but are managed by DB defaults + trigger
    },
    {
      tableName: table,
      timestamps: false,
      underscored: true,
    }
  );

  return Vendor;
};
