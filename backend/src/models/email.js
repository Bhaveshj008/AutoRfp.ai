const { DataTypes } = require("sequelize");
const { databases } = require("../config/dbMap.json");

module.exports = (sequelize) => {
  const table = databases.RFP.tables.EMAILS || "emails";

  const Email = sequelize.define(
    "Email",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      rfp_id: {
        type: DataTypes.UUID,
        allowNull: true, // ON DELETE SET NULL
      },
      vendor_id: {
        type: DataTypes.UUID,
        allowNull: true, // ON DELETE SET NULL
      },
      direction: {
        type: DataTypes.TEXT,
        allowNull: false, // 'outbound' | 'inbound'
      },
      subject: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      body_text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      message_id: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      received_at: {
        type: DataTypes.DATE,
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

  return Email;
};
