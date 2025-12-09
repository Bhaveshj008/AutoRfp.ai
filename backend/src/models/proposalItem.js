const { DataTypes } = require("sequelize");
const { databases } = require("../config/dbMap.json");

module.exports = (sequelize) => {
  const table = databases.RFP.tables.PROPOSAL_ITEMS || "proposal_items";

  const ProposalItem = sequelize.define(
    "ProposalItem",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      proposal_id: {
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
        allowNull: true,
      },
      unit_price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      total_price: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
      },
      matches_rfp: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
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

  return ProposalItem;
};
