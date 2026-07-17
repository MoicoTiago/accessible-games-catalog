import express from 'express';
import cors from 'cors';
import libraryRoutes from './routes/library.js';

/**
 * Core Express application used by both the HTTP server and integration tests.
 * Routes mounted here share the same middleware stack so supertest can hit the
 * same handlers without starting a listener.
 */
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', libraryRoutes);

export default app;

