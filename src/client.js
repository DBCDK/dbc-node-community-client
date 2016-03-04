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

function checkIfDisplayNameIsTaken(endpoint, {displayname}) {
  return promiseRequest('post', {
    url: `${endpoint}api/Profiles/checkIfDisplayNameIsTaken`,
    form: {
      displayname
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

function updateImage(endpoint, {image, relationId, relationType, accessToken}) {
  let fileExtension = image.originalname.split('.');
  fileExtension = fileExtension[fileExtension.length - 1];
  const fileName = uuid.v4().replace('-', '') + '.' + fileExtension;

  return promiseRequest('post', {
    url: endpoint + 'api/ImageCollections/upload?access_token=' + accessToken + '&container=uxdev-biblo-imagebucket',
    formData: {
      file: {
        value: image.buffer,
        options: {
          contentType: image.mimetype,
          filename: fileName
        }
      }
    }
  }).then((res) => {
    let remoteFileObject = JSON.parse(res.body);
    let bodyObj = {};
    bodyObj[relationType] = relationId;
    return promiseRequest(
      'put',
      {
        url: endpoint + 'api/ImageCollections/' + remoteFileObject.id + '?access_token=' + accessToken,
        json: true,
        body: bodyObj
      }
    );
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

function getImage(endpoint, {id}) {
  return promiseRequest('get', {
    url: endpoint + 'api/files/' + id
  });
}

function getResizedImage(endpoint, {id, size}) {
  return promiseRequest('get', {
    url: endpoint + 'api/imageCollections/' + id + '/download/' + size
  });
}

function joinGroup(endpoint, {uid, groupId, accessToken}) {
  return promiseRequest('put', {
    url: endpoint + 'api/Profiles/' + uid + '/groups/rel/' + groupId + '?access_token=' + accessToken,
    json: true
  });
}


function leaveGroup(endpoint, {uid, groupId, accessToken}) {
  return promiseRequest('del', {
    url: endpoint + 'api/Profiles/' + uid + '/groups/rel/' + groupId + '?access_token=' + accessToken,
    json: true
  });
}

function createGroup(endpoint, params) {
  const {name, description, colour, coverImage, uid, accessToken} = params;
  return promiseRequest('post', {
    url: endpoint + 'api/Groups?access_token' + accessToken,
    json: true,
    body: {
      name,
      description,
      colour,
      timeCreated: (new Date()).toUTCString(),
      groupownerid: uid
    }
  }).then((createResult) => {
    let fileExtension = coverImage.originalname.split('.');
    fileExtension = fileExtension[fileExtension.length - 1];
    const fileName = uuid.v4().replace('-', '') + '.' + fileExtension;

    joinGroup(endpoint, {
      uid,
      groupId: createResult.body.id,
      accessToken
    });

    return promiseRequest('post', {
      url: endpoint + 'api/ImageCollections/upload?access_token=' + accessToken + '&container=uxdev-biblo-imagebucket',
      formData: {
        file: {
          value: coverImage.buffer,
          options: {
            contentType: coverImage.mimetype,
            filename: fileName
          }
        }
      }
    }).then((fileResult) => {
      fileResult = JSON.parse(fileResult.body);
      return promiseRequest('put', {
        url: endpoint + 'api/ImageCollections/' + fileResult.id + '?access_token=' + accessToken,
        json: true,
        body: {
          groupCoverImageCollectionId: createResult.body.id
        }
      }).then((updatedFileResult) => {
        createResult.body.file = updatedFileResult.body;
        return Promise.resolve(createResult);
      });
    });
  });
}

/**
 * Fetches a Group in Loopback
 */
function getGroup(endpoint, params) {
  return new Promise((resolve) => {
    const id = params.id;
    const filter_str = JSON.stringify(params.filter || {});
    const url = endpoint + 'api/Groups/' + id + '?filter=' + filter_str;
    request.get(
      {
        url: url
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Fetches a posts for a group in Loopback
 */
function getPosts(endpoint, params) {
  return new Promise((resolve) => {
    const filter_str = JSON.stringify(params.filter || {});
    const url = endpoint + 'api/Posts/?filter=' + filter_str;
    request.get(
      {
        url: url
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}
/**
 * Fetches a comments for a post in Loopback
 */
function getComments(endpoint, params) {
  return new Promise((resolve) => {
    const id = params.id;
    const filter_str = JSON.stringify(params.filter || {});
    const url = `${endpoint}api/Posts/${id}/comments/?filter=${filter_str}`;
    request.get(
      {
        url: url
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Get all comments (not necessarily related to a specific post).
 */
function getAllComments(endpoint, params) {
  return promiseRequest('get', {
    url: `${endpoint}api/Comments/?filter=${JSON.stringify(params.filter || {})}`
  });
}

/**
 * Searches through Groups in Loopback
 */
function queryGroups(endpoint, params) {
  return new Promise((resolve, reject) => {
    const accessToken = params.accessToken;
    var pattern = new RegExp('.*' + params.query + '.*', 'i');
    const filter_str = JSON.stringify({where: {name: {regexp: pattern.toString()}}, include: ['members']});
    const url = endpoint + 'api/Groups?access_token=' + accessToken + '&filter=' + filter_str;
    request.get({url}, (err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });
}

/**
 * Create a Post on a Group
 */
function createPost(endpoint, params) {
  return new Promise((resolve, reject) => {
    const accessToken = params.accessToken;
    const groupId = params.parentId;
    const url = endpoint + 'api/Groups/' + groupId + '/posts?access_token=' + accessToken;
    const postBody = {
      title: params.title,
      content: params.content,
      timeCreated: (new Date()).toUTCString(),
      postownerid: params.ownerid,
      postcontainergroupid: groupId
    };

    request.post({
      url,
      json: true,
      body: postBody
    }, (err, res) => {
      if (err) {
        reject(err);
      }

      resolve(res);
    });
  });
}

/**
 * Create a Comment on a Post
 */
function createComment(endpoint, params) {
  return new Promise((resolve, reject) => {
    const accessToken = params.accessToken;
    const postId = params.parentId;
    const url = endpoint + 'api/Posts/' + postId + '/comments?access_token=' + accessToken;
    const postBody = {
      title: params.title,
      content: params.content,
      timeCreated: (new Date()).toUTCString(),
      commentownerid: params.ownerid,
      commentcontainerpostid: postId
    };

    request.post({
      url,
      json: true,
      body: postBody
    }, (err, res) => {
      if (err) {
        reject(err);
      }

      resolve(res);
    });
  });
}

function countComments(endpoint, {accessToken, where}) {
  return promiseRequest('get', `${endpoint}api/Comments/count?access_token=${accessToken}${where ? `&where=${JSON.stringify(where)}` : ''}`);
}

function countPosts(endpoint, {accessToken, where}) {
  return promiseRequest('get', `${endpoint}api/Posts/count?access_token=${accessToken}${where ? `&where=${JSON.stringify(where)}` : ''}`);
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
    checkIfDisplayNameIsTaken: checkIfDisplayNameIsTaken.bind(null, config.endpoint),
    loginAndGetProfile: loginAndGetProfile.bind(null, config.endpoint),
    createProfile: createProfile.bind(null, config.endpoint),
    updateProfile: updateProfile.bind(null, config.endpoint),
    updateImage: updateImage.bind(null, config.endpoint),
    getFullProfile: getFullProfile.bind(null, config.endpoint),
    getImage: getImage.bind(null, config.endpoint),
    getResizedImage: getResizedImage.bind(null, config.endpoint),
    joinGroup: joinGroup.bind(null, config.endpoint),
    leaveGroup: leaveGroup.bind(null, config.endpoint),
    getGroup: getGroup.bind(null, config.endpoint),
    getPosts: getPosts.bind(null, config.endpoint),
    getComments: getComments.bind(null, config.endpoint),
    getAllComments: getAllComments.bind(null, config.endpoint),
    queryGroups: queryGroups.bind(null, config.endpoint),
    createPost: createPost.bind(null, config.endpoint),
    createComment: createComment.bind(null, config.endpoint),
    createGroup: createGroup.bind(null, config.endpoint),
    countComments: countComments.bind(null, config.endpoint),
    countPosts: countPosts.bind(null, config.endpoint)
  };
}
