import { DataTypes } from 'sequelize';

export default (sequelize) => {
  sequelize.define('oauth_accounts', {
    id: {
      id: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    account_id: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    email: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    created: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    last_used: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    refresh: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    provider: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    external_id: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    enabled: {
      allowNull: true,
      type: DataTypes.BOOLEAN,
    },

  }, {
    timestamps: false,
  });
};
