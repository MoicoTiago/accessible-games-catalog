import Game from './Games.js';
import Tag from './Tag.js';
import sequelize from '../config/db.js';
import  User from './User.js';
import  Review from './Review.js';
import GameReport from './GameReport.js';
import ReviewVote from './ReviewVote.js';

// Define many\-to\-many associations after models are initialized
Game.belongsToMany(Tag, {
    through: 'GameTags',
    as: 'tags',
    foreignKey: 'gameId',
    otherKey: 'tagId'
});

Tag.belongsToMany(Game, {
    through: 'GameTags',
    as: 'games',
    foreignKey: 'tagId',
    otherKey: 'gameId'
});

User.belongsToMany(Game, {
    through: 'UserFollows',
    as: 'followedGames',
    foreignKey: 'userId',
    otherKey: 'gameId'
});

Game.belongsToMany(User, {
    through: 'UserFollows',
    as: 'followers',
    foreignKey: 'gameId',
    otherKey: 'userId'
});

Game.hasMany(Review, {
    as: 'reviews',
    foreignKey: 'gameId'
});
Review.belongsTo(Game, {
    foreignKey: 'gameId',
    as: 'game'
});


User.hasMany(Review, {
    as: 'reviews',
    foreignKey: 'userId'
});
Review.belongsTo(User, {
    as: 'user',
    foreignKey: 'userId'
});

Game.hasMany(GameReport, { as: 'reports', foreignKey: 'gameId' });
GameReport.belongsTo(Game, { as: 'game', foreignKey: 'gameId' });

User.hasMany(GameReport, { as: 'gameReports', foreignKey: 'userId' });
GameReport.belongsTo(User, { as: 'user', foreignKey: 'userId' });

Review.hasMany(ReviewVote, { as: 'votes', foreignKey: 'reviewId' });
ReviewVote.belongsTo(Review, { as: 'review', foreignKey: 'reviewId' });
User.hasMany(ReviewVote, { as: 'reviewVotes', foreignKey: 'userId' });
ReviewVote.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Export initialized models
export { Game, Tag, User, Review, GameReport, ReviewVote, sequelize };
export default { Game, Tag, User, Review, GameReport, ReviewVote, sequelize };
