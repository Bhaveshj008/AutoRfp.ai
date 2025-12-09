// src/models/rfpItemsModel.js
const { DataTypes } = require("sequelize");
const { databases } = require("../config/dbMap.json");

module.exports = (sequelize) => {
  const table = databases.RFP.tables.RFP_ITEMS || "rfp_items";

  const RfpItems = sequelize.define(
    "RfpItems",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      rfp_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      item_label: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      spec_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      sort_order: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      created_at: {
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

  return RfpItems;
};
