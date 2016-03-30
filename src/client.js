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

function removeImage(endpoint, {imageId, accessToken}) {
  return promiseRequest('del', {
    url: `${endpoint}api/ImageCollections/${imageId}?access_token=${accessToken}`
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
 * @param profileFilter
 */
function getFullProfile(endpoint, {uid, accessToken, profileFilter}) {
  let filter = {
    include: ['image']
  };

  if (profileFilter) {
    filter = Object.assign(filter, profileFilter);
  }

  return promiseRequest('get', {
    url: endpoint + 'api/Profiles/' + uid + '?filter=' + encodeURIComponent(JSON.stringify(filter)) + '&access_token=' + accessToken
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

/**
 * Lists groups given a filter (no search)
 * No access restrictions .
 *
 * @param endpoint
 * @param params
 * @returns {Promise}
 */
function listGroups(endpoint, params) {
  return new Promise((resolve) => {
    const filter_str = JSON.stringify(params.filter || []);
    const url = endpoint + 'api/Groups/?filter=' + filter_str;
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
 * Function to update a group.
 * @param endpoint {string}
 * @param groupId {int}
 * @param name {string}
 * @param description {string}
 * @param colour {string}
 * @param coverImage {file}
 * @param uid {int}
 * @param accessToken {string}
 * @param isModerator {boolean}
 */
function updateGroup(endpoint, {groupId, name, description, colour, coverImage, uid, accessToken, isModerator}) {
  if (!accessToken) {
    return Promise.reject('Please provide an access token!');
  }

  return promiseRequest('get', {
    url: `${endpoint}api/Groups/${groupId}?access_token=${accessToken}`,
    json: true
  }).then((groupGetResponse) => {
    const group = groupGetResponse.body;
    if (!isModerator && group.groupownerid !== uid) {
      return Promise.reject('User does not own the group!');
    }

    let promises = [];

    promises.push(promiseRequest('put', {
      url: `${endpoint}api/Groups/${groupId}?access_token=${accessToken}`,
      json: true,
      body: {
        name,
        description,
        colour
      }
    }));

    if (coverImage) {
      let fileExtension = coverImage.originalname.split('.');
      fileExtension = fileExtension[fileExtension.length - 1];
      const fileName = uuid.v4().replace('-', '') + '.' + fileExtension;

      promises.push(promiseRequest('post', {
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
      }));
    }

    return Promise.all(promises).then((promiseResponses) => {
      let createResult = promiseResponses[0];

      if (promiseResponses[1]) {
        let fileResult = JSON.parse(promiseResponses[1].body);
        return promiseRequest('put', {
          url: endpoint + 'api/ImageCollections/' + fileResult.id + '?access_token=' + accessToken,
          json: true,
          body: {
            groupCoverImageCollectionId: createResult.body.id
          }
        }).then((updatedFileResult) => {
          createResult.body.file = updatedFileResult.body;
          return Promise.resolve(createResult.body);
        });
      }

      return Promise.resolve(createResult.body);
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
    const filter_str = JSON.stringify(params.filter || {});
    const url = `${endpoint}api/Comments/?filter=${filter_str}`;
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
  const filter = JSON.stringify(params.filter || {});
  return promiseRequest('get', {
    url: `${endpoint}api/Comments/?filter=${filter}`
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
 *
 * @param {string} endpoint
 * @param {Object} params
 */
function createPost(endpoint, params) {
  return new Promise((resolve, reject) => {
    const accessToken = params.accessToken;
    const groupId = params.parentId;
    const url = endpoint + 'api/Posts?access_token=' + accessToken;
    let postBody = {
      title: params.title,
      content: params.content,
      timeCreated: params.timeCreated,
      postownerid: params.ownerid,
      postcontainergroupid: groupId,
      groupid: groupId,
      id: params.id || null
    };

    if (params.video) {
      postBody.mimetype = params.video.mimetype || null;
      postBody.videofile = params.video.videofile || null;
      postBody.container = params.video.container || null;
    }

    request.put({
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
    const url = endpoint + 'api/Comments?access_token=' + accessToken;
    const postBody = {
      title: params.title,
      content: params.content,
      timeCreated: params.timeCreated,
      commentownerid: params.ownerid,
      commentcontainerpostid: postId,
      postid: postId,
      id: params.id || null
    };

    request.put({
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

function countGroups(endpoint, {accessToken, where}) {
  return promiseRequest('get', `${endpoint}api/Groups/count?access_token=${accessToken}${where ? `&where=${JSON.stringify(where)}` : ''}`);
}

/**
 * Flag a Post
 */
function flagPost(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const postId = params.postId;
    const ownerId = params.flagger;
    const description = params.description;

    // Create flag
    const url = endpoint + 'api/Flags?access_token=' + accessToken;
    const flagPostBody = {
      timeFlagged: Date.now(),
      description,
      markedAsRead: false,
      ownerId,
      postFlagsId: postId
    };

    // create flag
    request.post({
      url,
      json: true,
      body: flagPostBody
    }, (err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });
}

/**
 * Flag a Comment
 */
function flagComment(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const commentId = params.commentId;
    const ownerId = params.flagger;
    const description = params.description;

    // Create flag
    const url = endpoint + 'api/Flags?access_token=' + accessToken;
    const flagCommentBody = {
      timeFlagged: Date.now(),
      description,
      markedAsRead: false,
      ownerId,
      commentFlagsId: commentId
    };

    // create flag
    request.post({
      url,
      json: true,
      body: flagCommentBody
    }, (err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });
}

/**
 * Flag a Group
 */
function flagGroup(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const groupId = params.groupId;
    const ownerId = params.flagger;
    const description = params.description;

    // Create flag
    const url = endpoint + 'api/Flags?access_token=' + accessToken;
    const flagGroupBody = {
      timeFlagged: Date.now(),
      description,
      markedAsRead: false,
      ownerId,
      groupFlagsId: groupId
    };

    // create flag
    request.post({
      url,
      json: true,
      body: flagGroupBody
    }, (err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });
}


/**
 * Like a post
 */
function likePost(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const profileId = params.profileId;
    const postId = params.postId;
    const value = '1'; //  like=1, dislike=-1

    const url = endpoint + 'api/Posts/' + postId + '/likes?access_token=' + accessToken;
    const likePostBody = {
      value,
      profileId
    };

    const requestParams = {
      url,
      json: true,
      body: likePostBody
    };

    // create like
    request.post(requestParams, (err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });
}


/**
 * unlike a post
 */
function unlikePost(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const profileId = params.profileId;
    const postId = params.postId;
    const value = '1'; //  like=1, dislike=-1

    const url = endpoint + 'api/Posts/' + postId + '/likes?access_token=' + accessToken;
    const likePostBody = {
      value,
      profileId
    };

    const requestParams = {
      url,
      json: true,
      body: likePostBody
    };

    // create like
    request.del(requestParams, (err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });
}


function checkIfProfileIsQuarantined(endpoint, id) {
  return promiseRequest('get', {url: `${endpoint}api/Quarantines/${id}/check-if-profile-is-quarantined`});
}

/**
 * Mark a post as deleted
 */
function markPostAsDeleted(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const postId = params.id;

    const url = endpoint + 'api/Posts/' + postId + '?access_token=' + accessToken;

    const deletePostBody = {
      markedAsDeleted: true
    };

    const requestParams = {
      url,
      json: true,
      body: deletePostBody
    };

    // create like
    request.put(requestParams, (err, res) => {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
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
    checkIfDisplayNameIsTaken: checkIfDisplayNameIsTaken.bind(null, config.endpoint),
    checkIfProfileIsQuarantined: checkIfProfileIsQuarantined.bind(null, config.endpoint),
    loginAndGetProfile: loginAndGetProfile.bind(null, config.endpoint),
    createProfile: createProfile.bind(null, config.endpoint),
    updateProfile: updateProfile.bind(null, config.endpoint),
    updateImage: updateImage.bind(null, config.endpoint),
    removeImage: removeImage.bind(null, config.endpoint),
    getFullProfile: getFullProfile.bind(null, config.endpoint),
    getImage: getImage.bind(null, config.endpoint),
    getResizedImage: getResizedImage.bind(null, config.endpoint),
    joinGroup: joinGroup.bind(null, config.endpoint),
    leaveGroup: leaveGroup.bind(null, config.endpoint),
    getGroup: getGroup.bind(null, config.endpoint),
    listGroups: listGroups.bind(null, config.endpoint),
    getPosts: getPosts.bind(null, config.endpoint),
    getComments: getComments.bind(null, config.endpoint),
    getAllComments: getAllComments.bind(null, config.endpoint),
    queryGroups: queryGroups.bind(null, config.endpoint),
    flagPost: flagPost.bind(null, config.endpoint),
    flagComment: flagComment.bind(null, config.endpoint),
    flagGroup: flagGroup.bind(null, config.endpoint),
    createPost: createPost.bind(null, config.endpoint),
    createComment: createComment.bind(null, config.endpoint),
    createGroup: createGroup.bind(null, config.endpoint),
    updateGroup: updateGroup.bind(null, config.endpoint),
    countComments: countComments.bind(null, config.endpoint),
    countGroups: countGroups.bind(null, config.endpoint),
    countPosts: countPosts.bind(null, config.endpoint),
    likePost: likePost.bind(null, config.endpoint),
    unlikePost: unlikePost.bind(null, config.endpoint),
    markPostAsDeleted: markPostAsDeleted.bind(null, config.endpoint)
  };
}
