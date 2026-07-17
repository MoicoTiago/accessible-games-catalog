// backend/server.js
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.js';
// import { sequelize } from './config/db.js';
import express from 'express';
import cors from 'cors';
import sequelize from './config/db.js';
import './models/index.js';
import { seedGames } from './config/seedGames.js';
import gamesRouter from './routes/games.js';
import { createDatabaseIfNotExists } from './config/createDatabase.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import voiceRouter from './routes/voice.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

app.use(cors());
app.use(express.json());

// Serve OpenAPI docs
let openapiDoc;
try {
    const openapiPath = path.join(__dirname, 'openapi.yaml');
    const raw = fs.readFileSync(openapiPath, 'utf8');
    openapiDoc = YAML.parse(raw);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
    app.get('/openapi.json', (_req, res) => res.json(openapiDoc));
    console.log('OpenAPI docs available at /api-docs');
} catch (err) {
    console.warn('OpenAPI spec not loaded:', err.message);
}

// Mount API routes (correct signatures)
app.use('/api/auth', authRouter);
app.use('/api/games', gamesRouter);
app.use('/api/users', usersRouter);
app.use('/api/voice', voiceRouter);
// library routes already mounted inside app.js at /api

// Error handler
app.use((err, req, res, next) => {
    console.error('[Unhandled]', err);
    res.status(500).json({ error: 'Internal server error', detail: err.message });
});

const PORT = Number(process.env.PORT) || 5000;
const IS_SQLITE = (process.env.DB_DIALECT || '').toLowerCase() === 'sqlite';

/**
 * Bootstraps the database (MariaDB or SQLite), seeds data, and starts the HTTP server.
 * Skips MariaDB bootstrap when running in SQLite mode (used by integration/Postman runs).
 */
async function start() {
    try {
        // When running against SQLite (e.g., integration tests / Postman smoke),
        // skip the MariaDB bootstrap so we don't require a running database server.
        if (!IS_SQLITE) {
            await createDatabaseIfNotExists();
        }
        await sequelize.authenticate();
        // this avoids alter:true to prevent repeated index changes causing MariaDB ER_TOO_MANY_KEYS
        await sequelize.sync();
        // set default accessibilityPreferences where null or empty
        try {
            await sequelize.query("UPDATE Users SET accessibilityPreferences='{\"visual\":false,\"motor\":false,\"cognitive\":false,\"hearing\":false}' WHERE accessibilityPreferences IS NULL OR accessibilityPreferences='' ");
            console.log('Accessibility preferences sanitized');
        } catch (sanErr) {
            console.warn('Sanitize accessibilityPreferences failed:', sanErr.message);
        }
        await seedGames();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
        console.log('Database connected & synced');
    } catch (err) {
        console.error('Startup failed:', err);
        process.exit(1);
    }
}

start();
