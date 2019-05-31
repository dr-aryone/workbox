/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

const assert = require('assert');
const expect = require('chai').expect;
const fse = require('fs-extra');
const makeServiceWorkerEnv = require('service-worker-mock');
const sinon = require('sinon');
const vm = require('vm');

// See https://github.com/chaijs/chai/issues/697
function stringifyFunctionsInArray(arr) {
  return arr.map((item) => typeof item === 'function' ? item.toString() : item);
}

function setupSpiesAndContext() {
  const addEventListener = sinon.spy();
  const importScripts = sinon.spy();

  const workboxContext = {
    CacheFirst: sinon.stub().returns({name: 'CacheFirst'}),
    clientsClaim: sinon.spy(),
    enable: sinon.spy(),
    getCacheKeyForURL: sinon.stub().returns('/urlWithCacheKey'),
    initialize: sinon.spy(),
    NetworkFirst: sinon.stub().returns({name: 'NetworkFirst'}),
    Plugin: sinon.spy(),
    Plugin$1: sinon.spy(),
    Plugin$2: sinon.spy(),
    precacheAndRoute: sinon.spy(),
    registerNavigationRoute: sinon.spy(),
    registerRoute: sinon.spy(),
    setCacheNameDetails: sinon.spy(),
    skipWaiting: sinon.spy(),
  };

  const context = Object.assign({
    importScripts,
    define: (_, scripts, callback) => {
      importScripts(...scripts);
      callback(workboxContext);
    },
  }, makeServiceWorkerEnv());
  context.self.addEventListener = addEventListener;

  return {addEventListener, context, methodsToSpies: workboxContext};
}

function validateMethodCalls({methodsToSpies, expectedMethodCalls}) {
  for (const [method, spy] of Object.entries(methodsToSpies)) {
    if (spy.called) {
      const args = spy.args.map(
          (arg) => Array.isArray(arg) ? stringifyFunctionsInArray(arg) : arg);
      expect(args).to.deep.equal(expectedMethodCalls[method],
          `while testing method calls for ${method}`);
    } else {
      expect(expectedMethodCalls[method],
          `while testing method calls for ${method}`).to.be.undefined;
    }
  }
}

/**
 * This is used in the service worker generation tests to validate core
 * service worker functionality. While we don't fully emulate a real service
 * worker runtime, we set up spies/stubs to listen for certain method calls,
 * run the code in a VM sandbox, and then verify that the service worker
 * made the expected method calls.
 *
 * If any of the expected method calls + parameter combinations were not made,
 * this method will reject with a description of what failed.
 *
 * @param {string} [swFile]
 * @param {string} [swString]
 * @param {Object} expectedMethodCalls
 * @return {Promise} Resolves if all of the expected method calls were made.
 */
module.exports = async ({
  addEventListenerValidation,
  expectedMethodCalls,
  swFile,
  swString,
}) => {
  assert((swFile || swString) && !(swFile && swString),
      `Set swFile or swString, but not both.`);

  if (swFile) {
    swString = await fse.readFile(swFile, 'utf8');
  }

  const {addEventListener, context, methodsToSpies} = setupSpiesAndContext();

  vm.runInNewContext(swString, context);

  validateMethodCalls({methodsToSpies, expectedMethodCalls});

  // Optionally check the usage of addEventListener().
  if (addEventListenerValidation) {
    addEventListenerValidation(addEventListener);
  }
};
