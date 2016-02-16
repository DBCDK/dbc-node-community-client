'use strict';

import request from 'request';
import uuid from 'node-uuid';

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

function updateProfileImage(endpoint, {uid, profileImage, accessToken}) {
  let fileExtension = profileImage.originalname.split('.');
  fileExtension = fileExtension[fileExtension.length - 1];
  const fileName = uuid.v4().replace('-', '') + '.' + fileExtension;

  return promiseRequest('post', {
    url: endpoint + 'api/files/upload?access_token=' + accessToken + '&container=uxdev-biblo-imagebucket',
    formData: {
      file: {
        value: profileImage.buffer,
        options: {
          contentType: profileImage.mimetype,
          filename: fileName
        }
      }
    }
  }).then((res) => {
    let remoteFileObject = JSON.parse(res.body);
    remoteFileObject.imageFile = remoteFileObject.id;
    delete remoteFileObject.id;
    return promiseRequest('post', {
      url: endpoint + 'api/Profiles/' + uid + '/image?access_token=' + accessToken,
      json: true,
      body: remoteFileObject
    });
  });
}

/**
 * Get Full profile (that is userprofile + image)
 * @param endpoint
 * @param uid
 * @param accessToken
 */
function getFullProfile(endpoint, {uid, accessToken}) {
  return promiseRequest('get', {
    url: endpoint + 'api/Profiles/' + uid + '?filter=%7B%22include%22%3A%5B%22image%22%5D%7D&access_token=' + accessToken
  });
}

function getProfileImage(endpoint, {id}) {
  return promiseRequest('get', {
    url: endpoint + 'api/files/' + id
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
    updateProfileImage: updateProfileImage.bind(null, config.endpoint),
    getFullProfile: getFullProfile.bind(null, config.endpoint),
    getProfileImage: getProfileImage.bind(null, config.endpoint)
  };
}
