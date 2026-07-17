import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sequelize } from './db.js';
import { ALL_TAGS } from '../models/tags.js';
import { Game, Tag, User, Review } from '../models/index.js';
// import sequelize from './db.js';
import bcrypt from 'bcrypt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Representative sample library to exercise filters thoroughly.
// Titles are unique so reseeding is idempotent.
const sample = [
        {
        title: 'Blockfall Classic',
        tags: ['Classic', 'Puzzle', 'Retro'],
        platform: 'NES',
        developer: 'Northstar Arcade',
        category: 'Puzzle',
        releaseDate: new Date('2021-06-06'),
        rating: 4.5,
        description: 'Arrange falling blocks, clear rows, and chase high scores with configurable visual cues.'
    },
    {
        title: 'Game A',
        tags: ['Action', 'Adventure'],
        platform: 'PC',
        developer: 'Dev A',
        category: 'Action',
        releaseDate: new Date('2020-01-01'),
        rating: 4.5,
        description: 'An exciting action-adventure game.'
    },
    {
        title: 'Game B',
        tags: ['RPG'],
        platform: 'Console',
        developer: 'Dev B',
        category: 'RPG',
        releaseDate: new Date('2019-05-15'),
        rating: 4.0,
        description: 'A captivating role-playing game.'
    },

    // Genres coverage
    { title: 'Aurora Quest', tags: ['Adventure', 'RPG', 'Vision', 'Colourblind Mode', 'High Contrast', 'Large Text', 'Screen Reader Friendly', 'Hearing', 'Captions', 'Visual Alerts', 'Cognitive', 'Clear Instructions', 'Adjustable Difficulty', 'Simple UI', 'Hints Available', 'Low Cognitive Load'], platform: 'PC & Console', releaseDate: new Date('2024-03-20'), rating: 4.8, thumbImages: ['/AuroraQuest1.jpeg', '/AuroraQuest2.jpeg', '/AuroraQuest3.jpeg'] },
    { title: 'Circuit Sprint', tags: ['Action', 'Sports', 'Motor', 'One-Handed', 'Simple Controls', 'No Timed Inputs', 'No Precision Needed', 'General UI/Gameplay', 'Low Cognitive Load'], platform: 'Mobile & Console', releaseDate: new Date('2023-11-05'), rating: 4.2, thumbImages: ['/CircuitSprint1.jpeg', '/CircuitSprint2.jpeg', '/CircuitSprint3.jpeg'] },
    { title: 'Puzzle Grove', tags: ['Puzzle', 'Casual', 'Cognitive', 'Simple UI', 'Clear Instructions', 'Tutorial Mode', 'Adjustable Difficulty', 'General UI/Gameplay', 'Hints Available', 'Low Cognitive Load'], platform: 'PC, Console & Mobile', releaseDate: new Date('2022-08-16'), rating: 4.6, thumbImages: ['/PuzzleGrove1.jpeg', '/PuzzleGrove2.jpeg', '/PuzzleGrove3.jpeg'] },
    { title: 'Skybound Strategy', tags: ['Strategy', 'Simulation', 'Vision', 'Screen Reader Friendly', 'Hearing', 'Captions', 'No Audio Needed', 'Cognitive', 'Adjustable Difficulty', 'Motor', 'No Timed Inputs'], platform: 'PC', releaseDate: new Date('2021-02-10'), rating: 4.3, thumbImages: ['/SkyboundStrategy1.jpeg', '/SkyboundStrategy2.jpeg', '/SkyboundStrategy3.jpeg'] },
    { title: 'Cozy Harbor', tags: ['Simulation', 'Casual', 'Hearing', 'No Audio Needed', 'Captions', 'Visual Alerts', 'Cognitive', 'Tutorial Mode', 'Clear Instructions', 'General UI/Gameplay', 'Low Cognitive Load'], platform: 'Switch & PC', releaseDate: new Date('2020-06-25'), rating: 4.4, thumbImages: ['/CozyHarbor1.jpeg', '/CozyHarbor2.jpeg', '/CozyHarbor3.jpeg'] },
    { title: 'Grove Guardians', tags: ['Action', 'Platformer', 'Motor', 'Simple Controls', 'No Precision Needed', 'Cognitive', 'Adjustable Difficulty', 'Vision', 'High Contrast', 'Large Text'], platform: 'Console', releaseDate: new Date('2024-01-12'), rating: 4.1, thumbImages: ['/GroveGuardians1.jpeg', '/GroveGuardians2.jpeg', '/GroveGuardians3.jpeg'] },
    { title: 'Quiet Current', tags: ['Adventure', 'Casual', 'Speech', 'No Voice Required', 'Hearing', 'No Audio Needed', 'Visual Alerts', 'Cognitive', 'Simple UI', 'General UI/Gameplay', 'Low Cognitive Load'], platform: 'PC & Mobile', releaseDate: new Date('2021-09-08'), rating: 4.0, thumbImages: ['/QuietCurrent1.jpeg', '/QuietCurrent2.jpeg', '/QuietCurrent3.jpeg'] },
    { title: 'Trailblazer Kids', tags: ['Kids', 'Adventure', 'Puzzle', 'Vision', 'Large Text', 'Screen Reader Friendly', 'Cognitive', 'Clear Instructions', 'Tutorial Mode', 'General UI/Gameplay', 'Hints Available'], platform: 'Tablet & Web', releaseDate: new Date('2023-04-03'), rating: 4.7, thumbImages: ['/TrailblazerKids1.jpeg', '/TrailblazerKids2.jpeg', '/TrailblazerKids3.jpeg'] },

    // Additional coverage to ensure every tag appears multiple times
    { title: 'Monochrome Run', tags: ['Action', 'Vision', 'Colourblind Mode', 'High Contrast', 'Motor', 'Simple Controls'], platform: 'PC', releaseDate: new Date('2022-10-01'), rating: 4.0, thumbImages: ['/MonochromeRun1.jpeg', '/MonochromeRun2.jpeg', '/MonochromeRun3.jpeg'] },
    { title: 'Echo City', tags: ['Adventure', 'Hearing', 'Captions', 'No Audio Needed', 'Visual Alerts', 'General UI/Gameplay', 'Low Cognitive Load'], platform: 'PC & Console', releaseDate: new Date('2021-12-11'), rating: 3.9, thumbImages: ['/EchoCity1.jpeg', '/EchoCity2.jpeg', '/EchoCity3.jpeg'] },
    { title: 'One-Handed Hero', tags: ['Action', 'Motor', 'One-Handed', 'No Precision Needed', 'No Timed Inputs'], platform: 'Mobile', releaseDate: new Date('2023-03-15'), rating: 4.1, thumbImages: ['/OneHandedHero1.jpeg', '/OneHandedHero2.jpeg', '/OneHandedHero3.jpeg'] },
    { title: 'Tutor Isles', tags: ['Puzzle', 'Cognitive', 'Tutorial Mode', 'Clear Instructions', 'Adjustable Difficulty', 'General UI/Gameplay', 'Hints Available'], platform: 'Web', releaseDate: new Date('2022-06-05'), rating: 4.5, thumbImages: ['/TutorIsles1.jpeg', '/TutorIsles2.jpeg', '/TutorIsles3.jpeg'] },
    { title: 'High Contrast Tactics', tags: ['Strategy', 'Vision', 'High Contrast', 'Large Text', 'Screen Reader Friendly'], platform: 'PC', releaseDate: new Date('2020-09-18'), rating: 4.2, thumbImages: ['/HighContrastTactics1.jpeg', '/HighContrastTactics2.jpeg', '/HighContrastTactics3.jpeg'] },
    { title: 'Tap Tap Trails', tags: ['Casual', 'General UI/Gameplay', 'Tap Only', 'Low Cognitive Load', 'Motor', 'Simple Controls'], platform: 'Mobile', releaseDate: new Date('2021-01-22'), rating: 3.8, thumbImages: ['/TapTapTrails1.jpeg', '/TapTapTrails2.jpeg', '/TapTapTrails3.jpeg'] },
    { title: 'Platform Peaks', tags: ['Platformer', 'Action', 'Cognitive', 'Adjustable Difficulty', 'General UI/Gameplay', 'Hints Available'], platform: 'Console', releaseDate: new Date('2022-04-10'), rating: 4.0, thumbImages: ['/PlatformPeaks1.jpeg', '/PlatformPeaks2.jpeg', '/PlatformPeaks3.jpeg'] },
    { title: 'RPG Lanterns', tags: ['RPG', 'Vision', 'Large Text', 'Colourblind Mode', 'Cognitive', 'Simple UI'], platform: 'PC', releaseDate: new Date('2023-07-07'), rating: 4.3, thumbImages: ['/RPGLanterns1.jpeg', '/RPGLanterns2.jpeg', '/RPGLanterns3.jpeg'] },
    { title: 'Strategy Seeds', tags: ['Strategy', 'Simulation', 'Motor', 'No Timed Inputs', 'No Precision Needed'], platform: 'PC', releaseDate: new Date('2020-11-30'), rating: 3.9, thumbImages: ['/StrategySeeds1.jpeg', '/StrategySeeds2.jpeg', '/StrategySeeds3.jpeg'] },
    { title: 'Calm Puzzles', tags: ['Puzzle', 'Casual', 'Cognitive', 'Simple UI', 'General UI/Gameplay', 'Low Cognitive Load'], platform: 'Mobile', releaseDate: new Date('2024-02-02'), rating: 4.4, thumbImages: ['/CalmPuzzles1.jpeg', '/CalmPuzzles2.jpeg', '/CalmPuzzles3.jpeg'] },
    { title: 'Captions Cup', tags: ['Sports', 'Hearing', 'Captions', 'Visual Alerts'], platform: 'Console', releaseDate: new Date('2021-05-21'), rating: 3.7, thumbImages: ['/CaptionsCup1.jpeg', '/CaptionsCup2.jpeg', '/CaptionsCup3.jpeg'] },
    { title: 'Speechless Shores', tags: ['Adventure', 'Speech', 'No Voice Required', 'Hearing', 'No Audio Needed'], platform: 'PC', releaseDate: new Date('2022-12-13'), rating: 4.1, thumbImages: ['/SpeechlessShores1.jpeg', '/SpeechlessShores2.jpeg', '/SpeechlessShores3.jpeg'] },
    { title: 'Hint Harbor', tags: ['Simulation', 'General UI/Gameplay', 'Hints Available', 'Cognitive', 'Clear Instructions'], platform: 'PC & Web', releaseDate: new Date('2023-09-09'), rating: 4.0, thumbImages: ['/HintHarbor1.jpeg', '/HintHarbor2.jpeg', '/HintHarbor3.jpeg'] },
    { title: 'Retro Runner', tags: ['Action', 'Platformer', 'Motor', 'Simple Controls', 'No Precision Needed'], platform: 'Console', releaseDate: new Date('2020-03-03'), rating: 3.6, thumbImages: ['/RetroRunner1.jpeg', '/RetroRunner2.jpeg', '/RetroRunner3.jpeg'] },
    { title: 'Navigator Buddies', tags: ['Kids', 'Cognitive', 'Tutorial Mode', 'Clear Instructions', 'General UI/Gameplay', 'Tap Only'], platform: 'Tablet', releaseDate: new Date('2022-01-15'), rating: 4.6, thumbImages: ['/CoachKids1.jpeg', '/CoachKids2.jpeg', '/CoachKids3.jpeg'] },
    { title: 'Logic Lagoon', tags: ['Puzzle', 'Cognitive', 'Adjustable Difficulty', 'General UI/Gameplay', 'Low Cognitive Load'], platform: 'Web', releaseDate: new Date('2022-02-14'), rating: 4.2, thumbImages: ['/LogicLagoon1.jpeg', '/LogicLagoon2.jpeg', '/LogicLagoon3.jpeg'] }

];

const sampleUsers = [
    { username: 'admin', password: 'adminPass123', email: 'admin@example.local', isAdmin: true },
    { username: 'alice', password: 'password123', email: 'alice@example.local', isAdmin: false },
    { username: 'bob', password: 'password456', email: 'bob@example.local', isAdmin: false },
    { username: 'charlie', password: 'password789', email: 'charlie@example.local', isAdmin: false }
];

const sampleReviews = [
    { username: 'alice', gameTitle: 'Blockfall Classic', rating: 5, comment: 'A polished take on a classic puzzle format.' },
    { username: 'bob', gameTitle: 'Blockfall Classic', rating: 2, comment: 'The pace is not for me.' },
    { username: 'charlie', gameTitle: 'Blockfall Classic', rating: 3, comment: 'Useful visual cues, but more options would help.' },
    { username: 'bob', gameTitle: 'Game A', rating: 4, comment: 'Great action sequences and story.' },
    { username: 'charlie', gameTitle: 'Game B', rating: 3, comment: 'Good RPG but a bit slow-paced.' }
];

/**
 * Idempotently seeds tags, users, games, and reviews.
 * When `reset` is true, truncates existing data before seeding.
 * Intended for dev/startup and integration/test runs.
 */
export async function seedGames({ reset = false } = {}) {
    await sequelize.transaction(async (t) => {
        if (reset) {
            await Review.destroy({ where: {}, truncate: true, cascade: true, transaction: t });
            await Game.destroy({ where: {}, truncate: true, cascade: true, transaction: t });
            await Tag.destroy({ where: {}, truncate: true, cascade: true, transaction: t });
            await User.destroy({ where: {}, truncate: true, cascade: true, transaction: t });
            console.log('Reset complete');
        }

        // Ensure all canonical tags exist (idempotent)
        for (const tagName of ALL_TAGS) {
            await Tag.findOrCreate({
                where: { name: tagName },
                defaults: { name: tagName },
                transaction: t
            });
        }

        // Seed users
        for (const u of sampleUsers) {
            const hashed = await bcrypt.hash(u.password, 10);
            await User.findOrCreate({
                where: { username: u.username },
                defaults: {
                    username: u.username,
                    email: u.email,
                    password: hashed,
                    isAdmin: !!u.isAdmin,
                },
                transaction: t
            });
        }
        console.log('Users seeded');

        // Seed games
        for (const g of sample) {
            const slug = encodeURIComponent(String(g.title || '').toLowerCase().replace(/\\s+/g, '-'));
            const thumbImages = g.thumbImages ?? [`https://picsum.photos/seed/${slug || 'game'}/640/360`];
            const [game, created] = await Game.findOrCreate({
                where: { title: g.title },
                defaults: {
                    platform: g.platform ?? null,
                    developer: g.developer ?? null,
                    category: g.category ?? null,
                    releaseDate: g.releaseDate ?? null,
                    rating: g.rating ?? null,
                    description: g.description ?? null,
                    thumbImages
                },
                transaction: t
            });
            // Keep fields updated on subsequent runs without recreating
            await game.update(
                {
                    platform: g.platform,
                    releaseDate: g.releaseDate,
                    rating: g.rating,
                    thumbImages
                },
                { transaction: t }
            );

            if (!created) {
                const patch = {};
                for (const k of ['platform','developer','category','releaseDate','rating','description','thumbImages']) {
                    const incoming = g[k];
                    const value = k === 'thumbImages' ? thumbImages : incoming;
                    if (value != null && JSON.stringify(game[k]) !== JSON.stringify(value)) {
                        patch[k] = value;
                    }
                }
                if (Object.keys(patch).length) {
                    await game.update(patch, { transaction: t });
                }
            }

            const tagRows = [];
            for (const tagName of g.tags) {
                // By now tags should exist, but keep this idempotent
                const [tag] = await Tag.findOrCreate({
                    where: { name: tagName },
                    defaults: { name: tagName },
                    transaction: t
                });
                tagRows.push(tag);
            }

            const existing = new Set(
                (await game.getTags({ attributes: ['id'], transaction: t })).map(tr => tr.id)
            );
            const toAdd = tagRows.filter(tr => !existing.has(tr.id));
            if (toAdd.length) {
                await game.addTags(toAdd, { transaction: t });
            }
        }
        console.log('Games seeded');

        // Seed reviews
        for (const r of sampleReviews) {
            const user = await User.findOne({ where: { username: r.username }, transaction: t });
            const game = await Game.findOne({ where: { title: r.gameTitle }, transaction: t });

            if (user && game) {
                await Review.findOrCreate({
                    where: { userId: user.id, gameId: game.id },
                    defaults: {
                        userId: user.id,
                        gameId: game.id,
                        rating: r.rating,
                        comment: r.comment
                    },
                    transaction: t
                });
            }
        }
        console.log('Reviews seeded');
    });

    console.log('Seed complete');
}

if (process.argv[1]?.endsWith('seedGames.js')) {
    (async () => {
        // Safe sync in dev scripts: avoid ALTER to prevent driver issues
        await sequelize.sync();
        await seedGames({ reset: false });
        process.exit(0);
    })().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
