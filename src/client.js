'use strict';

import request from 'request';

function promiseRequest(method, req) {
  return new Promise((resolve, reject) => {
    request[method](req, (err, httpResponse) => {
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
  return promiseRequest('post', {
    url: `${endpoint}api/Profiles/unilogin`,
    form: {username, timestamp, authtoken, ttl}
  });
}

function checkIfUserProfileExists(endpoint, params) {
  return promiseRequest('post', {
    url: `${endpoint}api/Profiles/checkIfUserExists`,
    form: {
      username: params.username
    }
  });
}

function createProfile(endpoint, {username}) {
  return promiseRequest('post', {
    url: endpoint + 'api/Profiles',
    json: {
      username,
      created: Date.now(),
      lastUpdated: Date.now()
    }
  });
}

function updateProfile(endpoint, {uid, profile, accessToken}) {
  return promiseRequest('put', {
    url: endpoint + 'api/Profiles/' + uid + '?access_token=' + accessToken,
    body: profile,
    json: true
  });
}


function joinGroup(endpoint, {uid, groupId, accessToken}) {
  return promiseRequest('put', {
    url: endpoint + 'api/Profiles/' + uid + '/groups/rel/' + groupId + '?access_token=' + accessToken,
    json: true
  });
}


function leaveGroup(endpoint, {uid, groupId, accessToken}) {
  return promiseRequest('delete', {
    url: endpoint + 'api/Profiles/' + uid + '/groups/rel/' + groupId + '?access_token=' + accessToken,
    json: true
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
    createProfile: createProfile.bind(null, config.endpoint),
    updateProfile: updateProfile.bind(null, config.endpoint),
    joinGroup: joinGroup.bind(null, config.endpoint),
    leaveGroup: leaveGroup.bind(null, config.endpoint)
  };
}
