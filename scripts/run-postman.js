'use strict';

/**
 * Spins up the backend with SQLite (in-memory), seeds data, waits for readiness,
 * then runs the Postman collection via Newman. Intended to make `npm run test:postman`
 * self-contained (no MariaDB required, no manual server start).
 */

const { spawn } = require('child_process');
const path = require('path');
const newman = require('newman');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';
const PORT = Number(process.env.PORT) || 5000;
const MAX_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 500;

const env = {
  ...process.env,
  PORT: String(PORT),
  DB_DIALECT: 'sqlite',
  DB_STORAGE: ':memory:',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'local',
  DB_PASS: process.env.DB_PASS || 'local',
  DB_NAME: process.env.DB_NAME || 'accessible-games',
  JWT_SECRET: process.env.JWT_SECRET || 'devsecret'
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  const deadline = Date.now() + MAX_WAIT_MS;
  const url = `${BASE_URL.replace(/\/$/, '')}/tag-groups`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore until deadline
    }
    await wait(POLL_INTERVAL_MS);
  }
  throw new Error(`Server not reachable at ${url} after ${MAX_WAIT_MS}ms`);
}

async function main() {
  console.log('Starting backend (SQLite) for Postman collection...');
  const server = spawn('node', [path.join('backend', 'server.js')], {
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let serverExited = false;
  server.on('exit', (code, signal) => {
    serverExited = true;
    console.error(`Backend exited early (code=${code} signal=${signal})`);
  });

  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

  try {
    await waitForServer();
  } catch (err) {
    console.error(err.message);
    server.kill('SIGTERM');
    process.exit(1);
  }

  console.log('Backend is up, running Postman collection via Newman...');
  const collection = path.join(__dirname, '..', 'backend', 'postman', 'backend-api.postman_collection.json');
  const environment = path.join(__dirname, '..', 'backend', 'postman', 'local.postman_environment.json');

  await new Promise((resolve, reject) => {
    newman.run(
      {
        collection,
        environment,
        reporters: 'cli'
      },
      (err, summary) => {
        if (err) return reject(err);
        const failures = summary?.run?.failures || [];
        if (failures.length) {
          const messages = failures.map((f) => `${f.source.name}: ${f.error?.message || f.error}`).join('\\n');
          const error = new Error(`Postman failures:\\n${messages}`);
          error.failures = failures;
          return reject(error);
        }
        return resolve();
      }
    );
  }).catch((err) => {
    console.error(err.message || err);
    throw err;
  }).finally(() => {
    if (!serverExited) {
      server.kill('SIGTERM');
    }
  });
}

main().catch(() => {
  process.exit(1);
});
