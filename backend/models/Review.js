import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Review = sequelize.define(
    'Review',
    {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1, max: 5 }
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        gameId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
        // Foreign keys (gameId, userId) are added by associations in models/index.js
    },
    {
        tableName: 'reviews',
        timestamps: true
    }
);

export default Review;
