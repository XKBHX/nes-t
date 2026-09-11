'use strict';

const path = require('path');

process.env.TS_NODE_PROJECT =
  process.env.TS_NODE_PROJECT || path.join(__dirname, '..', 'tsconfig.test.json');

if (typeof global.document === 'undefined') {
  global.document = {
    addEventListener() {},
    removeEventListener() {},
  };
}

if (typeof global.window === 'undefined') {
  global.window = {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
  };
}

if (typeof global.navigator === 'undefined') {
  global.navigator = { gpu: undefined };
}

if (process.env.NES_TEST_VERBOSE !== '1') {
  console.log = () => {};
}

require('ts-node/register');
