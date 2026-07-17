// filepath: backend/models/ReviewVote.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ReviewVote = sequelize.define(
  'ReviewVote',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { isIn: [[-1, 1]] }
    },
    reviewId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  },
  {
    tableName: 'review_votes',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId', 'reviewId'] }
    ]
  }
);

export default ReviewVote;
