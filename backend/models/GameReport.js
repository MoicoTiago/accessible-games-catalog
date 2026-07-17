import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const GameReport = sequelize.define('GameReport', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false, // false = unresolved, true = resolved
  },
}, {
  tableName: 'GameReports',
  timestamps: true,
});

export default GameReport;

