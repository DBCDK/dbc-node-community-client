'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = CommunityClient;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

function promiseGetRequest(req) {
  // eslint-disable-line
  return new Promise(function (resolve, reject) {
    _request2['default'].get(req, function (err, httpResponse) {
      if (err) {
        reject(err, httpResponse);
      } else {
        resolve(httpResponse);
      }
    });
  });
}

function promisePostRequest(req) {
  return new Promise(function (resolve, reject) {
    _request2['default'].post(req, function (err, httpResponse) {
      if (err) {
        reject(err, httpResponse);
      } else {
        resolve(httpResponse);
      }
    });
  });
}

function loginAndGetProfile(endpoint, _ref) {
  var username = _ref.username;
  var timestamp = _ref.timestamp;
  var authtoken = _ref.authtoken;
  var ttl = _ref.ttl;

  return promisePostRequest({
    url: endpoint + 'api/Profiles/unilogin',
    form: { username: username, timestamp: timestamp, authtoken: authtoken, ttl: ttl }
  });
}

function checkIfUserProfileExists(endpoint, params) {
  var req = {
    url: endpoint + 'api/Profiles/checkIfUserExists',
    form: {
      username: params.username
    }
  };

  return promisePostRequest(req);
}

/**
 * Setting the necessary paramerters for the client to be usable.
 * The endpoint is only set if endpoint is null to allow setting it through
 * environment variables.
 *
 * @param {Object} config Config object with the necessary parameters to use
 * the webservice
 */

function CommunityClient() {
  var config = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];

  if (!config || !config.endpoint) {
    throw new Error('Expected config object but got null or no endpoint provided');
  }

  return {
    checkIfUserProfileExists: checkIfUserProfileExists.bind(null, config.endpoint),
    loginAndGetProfile: loginAndGetProfile.bind(null, config.endpoint)
  };
}

module.exports = exports['default'];