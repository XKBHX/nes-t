#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const testDir = path.join(root, 'test');
const extra = process.argv.slice(2);
const files = fs
  .readdirSync(testDir)
  .filter((name) => name.endsWith('.test.ts'))
  .sort()
  .map((name) => path.join('test', name));

if (files.length === 0) {
  console.error('No test/*.test.ts files found');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--require', path.join(root, 'test', 'register.cjs'), '--test', ...extra, ...files],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_PROJECT: path.join(root, 'tsconfig.test.json'),
    },
  }
);

process.exit(result.status === null ? 1 : result.status);
