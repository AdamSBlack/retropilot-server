const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
	sequelize.define('athena_returned_data', {
		id: {
			allowNull: false,
			autoIncrement: true,
			primaryKey: true,
			type: DataTypes.INTEGER
		},
        account_id: {
			allowNull: false,
			type: DataTypes.INTEGER
		},
        device_id: {
			allowNull: true,
			type: DataTypes.INTEGER
		},
        type: {
			allowNull: true,
			type: DataTypes.TEXT
		},
        data: {
			allowNull: true,
			type: DataTypes.BLOB
		},
        created_at: {
			allowNull: true,
			type: DataTypes.TEXT
		},

	}, {
		timestamps: false,
	});
};