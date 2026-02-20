#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const rootEnvPath = path.join(repoRoot, '.env');

const stripQuotes = (value) => {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
};

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const result = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      return;
    }

    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const splitIndex = normalized.indexOf('=');
    if (splitIndex <= 0) {
      return;
    }

    const key = normalized.slice(0, splitIndex).trim();
    const value = stripQuotes(normalized.slice(splitIndex + 1).trim());

    if (!key) {
      return;
    }

    result[key] = value;
  });

  return result;
};

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error('[with-root-env] Missing command. Usage: node scripts/with-root-env.js <command> [...args]');
  process.exit(1);
}

if (!fs.existsSync(rootEnvPath)) {
  console.warn(`[with-root-env] Root .env not found at ${rootEnvPath}. Continuing with existing process env.`);
}

const localEnvPath = path.join(process.cwd(), '.env');
if (command.includes('react-scripts') && fs.existsSync(localEnvPath)) {
  console.warn(`[with-root-env] Found local env file at ${localEnvPath}. Root .env is canonical; remove local env files to avoid drift.`);
}

const envValues = parseEnvFile(rootEnvPath);
const mergedEnv = { ...process.env };

Object.entries(envValues).forEach(([key, value]) => {
  if (mergedEnv[key] === undefined) {
    mergedEnv[key] = value;
  }
});

const child = spawn(command, args, {
  stdio: 'inherit',
  env: mergedEnv,
  shell: true,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code || 0);
});
