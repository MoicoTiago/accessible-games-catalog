import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Game = sequelize.define(
    'Game',
    {
        title: { type: DataTypes.STRING, allowNull: false },
        platform: { type: DataTypes.STRING },
        developer: { type: DataTypes.STRING },
        category: { type: DataTypes.STRING },
        releaseDate: { type: DataTypes.DATE },
        rating: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
        description: { type: DataTypes.TEXT },
        thumbImages: { type: DataTypes.JSON }
    },
    {
        tableName: 'games',
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
);

export default Game;