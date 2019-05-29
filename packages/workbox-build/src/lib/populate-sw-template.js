/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

const path = require('path');
const template = require('lodash.template');
const swTemplate = require('../templates/sw-template');

const errors = require('./errors');
const runtimeCachingConverter = require('./runtime-caching-converter');
const stringifyWithoutComments = require('./stringify-without-comments');

module.exports = async ({
  cacheId,
  cleanupOutdatedCaches,
  clientsClaim,
  directoryIndex,
  ignoreURLParametersMatching,
  importScripts,
  manifestEntries,
  modulePathPrefix,
  navigateFallback,
  navigateFallbackBlacklist,
  navigateFallbackWhitelist,
  navigationPreload,
  offlineGoogleAnalytics,
  runtimeCaching,
  skipWaiting,
}) => {
  // These are all options that can be passed to the precacheAndRoute() method.
  const precacheOptions = {
    directoryIndex,
    // An array of RegExp objects can't be serialized by JSON.stringify()'s
    // default behavior, so if it's given, convert it manually.
    ignoreURLParametersMatching: ignoreURLParametersMatching ?
      [] :
      undefined,
  };

  let precacheOptionsString = JSON.stringify(precacheOptions, null, 2);
  if (ignoreURLParametersMatching) {
    precacheOptionsString = precacheOptionsString.replace(
        `"ignoreURLParametersMatching": []`,
        `"ignoreURLParametersMatching": [` +
      `${ignoreURLParametersMatching.join(', ')}]`
    );
  }

  let offlineAnalyticsConfigString;
  if (offlineGoogleAnalytics) {
    // If offlineGoogleAnalytics is a truthy value, we need to convert it to the
    // format expected by the template.
    offlineAnalyticsConfigString = offlineGoogleAnalytics === true ?
      // If it's the literal value true, then use an empty config string.
      '{}' :
      // Otherwise, convert the config object into a more complex string, taking
      // into account the fact that functions might need to be stringified.
      stringifyWithoutComments(offlineGoogleAnalytics);
  }

  const nodeModulesPath = path.posix.resolve(
      __dirname, '..', '..', 'node_modules');

  try {
    return template(swTemplate)({
      cacheId,
      cleanupOutdatedCaches,
      clientsClaim,
      importScripts,
      manifestEntries,
      modulePathPrefix,
      navigateFallback,
      navigateFallbackBlacklist,
      navigateFallbackWhitelist,
      navigationPreload,
      nodeModulesPath,
      offlineAnalyticsConfigString,
      precacheOptionsString,
      skipWaiting,
      runtimeCaching: runtimeCachingConverter(runtimeCaching),
    });
  } catch (error) {
    throw new Error(
        `${errors['populating-sw-tmpl-failed']} '${error.message}'`);
  }
};
