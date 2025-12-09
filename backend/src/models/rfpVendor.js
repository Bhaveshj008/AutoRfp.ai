const { DataTypes } = require("sequelize");
const { databases } = require("../config/dbMap.json");

module.exports = (sequelize) => {
  const table = databases.RFP.tables.RFP_VENDORS || "rfp_vendors";

  const RfpVendor = sequelize.define(
    "RfpVendor",
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
      invite_status: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "pending", // 'pending','sent','bounced'
      },
      invited_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      last_email_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      reply_token: {
        type: DataTypes.STRING(64),
        allowNull: true,
        unique: true,
      },
    },
    {
      tableName: table,
      timestamps: false,
      underscored: true,
    }
  );

  return RfpVendor;
};
