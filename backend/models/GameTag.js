import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const GameTag = sequelize.define(
    'GameTag',
    {
        gameId: { type: DataTypes.INTEGER, allowNull: false },
        tagId: { type: DataTypes.INTEGER, allowNull: false }
    },
    {
        tableName: 'game_tags',
        timestamps: false,
        indexes: [
            { unique: true, fields: ['gameId', 'tagId'] }
        ]
    }
);

export default GameTag;