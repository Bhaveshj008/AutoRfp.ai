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
        type: DataTypes.DECIMAL(3, 2), // 0–9.99 (you'll use 0–5)
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
