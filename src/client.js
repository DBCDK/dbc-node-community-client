'use strict';

import request from 'request';

function promiseGetRequest(req) { // eslint-disable-line
  return new Promise((resolve, reject) => {
    request.get(req, (err, httpResponse) => {
      if (err) {
        reject(err, httpResponse);
      }
      else {
        resolve(httpResponse);
      }
    });
  });
}

function promisePostRequest(req) {
  return new Promise((resolve, reject) => {
    request.post(req, (err, httpResponse) => {
      if (err) {
        reject(err, httpResponse);
      }
      else {
        resolve(httpResponse);
      }
    });
  });
}

function loginAndGetProfile(endpoint, {username, timestamp, authtoken, ttl}) {
  return promisePostRequest({
    url: `${endpoint}api/Profiles/unilogin`,
    form: {username, timestamp, authtoken, ttl}
  });
}

function checkIfUserProfileExists(endpoint, params) {
  const req = {
    url: `${endpoint}api/Profiles/checkIfUserExists`,
    form: {
      username: params.username
    }
  };

  return promisePostRequest(req);
}

function createProfile(endpoint, {username}) {
  return promisePostRequest({
    url: endpoint + 'api/Profiles',
    json: {
      username,
      created: Date.now(),
      lastUpdated: Date.now()
    }
  });
}

/**
 * Setting the necessary paramerters for the client to be usable.
 * The endpoint is only set if endpoint is null to allow setting it through
 * environment variables.
 *
 * @param {Object} config Config object with the necessary parameters to use
 * the webservice
 */
export default function CommunityClient(config = null) {

  if (!config || !config.endpoint) {
    throw new Error('Expected config object but got null or no endpoint provided');
  }

  return {
    checkIfUserProfileExists: checkIfUserProfileExists.bind(null, config.endpoint),
    loginAndGetProfile: loginAndGetProfile.bind(null, config.endpoint),
    createProfile: createProfile.bind(null, config.endpoint)
  };
}
