'use strict';

const request = require('request');
const uuid = require('node-uuid');
const http = require('http');
const url = require('url');
const forever = require('async/forever');

/**
 * This is a helper function to create an infinite long polling listener on a change stream
 * @param {String} endpoint
 * @param {String} model
 * @param {Function || Array[Function]} callback
 * @param {Object} logger
 * @returns {Promise}
 */
function changeStreamListener(endpoint, model, callback, logger) {
  return new Promise((resolve) => {
    const opts = url.parse(`${endpoint}api/${model}/change-stream?_format=event-stream`);
    opts.agent = new http.Agent({keepAlive: true});

    const eventRegex = /^event: ([a-zA-Z]+)/;
    let currentEvent = 'someunidentifiedevent: ';
    let resolved = false;

    let cb = callback;
    if (Array.isArray(callback)) {
      cb = (err, res) => {
        callback.forEach((cbf) => cbf(err, res));
      };
    }

    forever(retry => {
      http.get(opts, response => {
        response.on('data', d => {
          const dataString = d.toString();

          if (dataString.indexOf(':ok') === 0) {
            if (!resolved) {
              resolved = true;
              resolve({created: true});
            }

            logger.info(`Started listening to ${model}`);
          }
          else if (dataString.indexOf('event: ') === 0) {
            currentEvent = `${eventRegex.exec(dataString)[1]}: `;
          }
          else if (dataString.indexOf(currentEvent) === 0) {
            const jsonData = JSON.parse(dataString.substring(currentEvent.length));
            cb(null, jsonData);
          }
          else {
            cb('something weird happened');
          }
        });

        response.on('error', error => {
          logger.error(`got error from ${model} change stream, retrying`, error);
          retry();
        });

        response.on('end', () => {
          logger.info(`${model} stream ended, retrying`);
          retry();
        });
      });
    });
  });
}

/**
 * A helper function to create a promise which resolves to the http response.
 * @param {String} method - Method to use when executing the request.
 * @param {PlainObject} req - Request object that is passed to the request method.
 * @returns {Promise}
 */
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
  }).then((httpResponse) => {
    if (httpResponse && httpResponse.statusCode !== 200) {
      return Promise.reject(httpResponse.statusCode, httpResponse);
    }

    return Promise.resolve(httpResponse);
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
      attachedReviewId: params.attachedReviewId,
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
      attachedReviewId: params.attachedReviewId,
      commentownerid: params.ownerid,
      commentcontainerpostid: postId,
      postid: postId,
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

function countComments(endpoint, {accessToken, where}) {
  return promiseRequest('get', `${endpoint}api/Comments/count?access_token=${accessToken}${where ? `&where=${JSON.stringify(where)}` : ''}`);
}

function countPosts(endpoint, {accessToken, where}) {
  return promiseRequest('get', `${endpoint}api/Posts/count?access_token=${accessToken}${where ? `&where=${JSON.stringify(where)}` : ''}`);
}

function countGroups(endpoint, {accessToken, where}) {
  return promiseRequest('get', `${endpoint}api/Groups/count?access_token=${accessToken}${where ? `&where=${JSON.stringify(where)}` : ''}`);
}

function countReviews(endpoint, {accessToken, where}) {
  return promiseRequest('get', `${endpoint}api/reviews/count?access_token=${accessToken}${where ? `&where=${JSON.stringify(where)}` : ''}`);
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
 * Flag a Review 
 */
function flagReview(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const reviewId = params.reviewId;
    const ownerId = params.flagger;
    const description = params.description;

    // Create flag
    const url = endpoint + 'api/Flags?access_token=' + accessToken;
    const reviewGroupBody = {
      timeFlagged: Date.now(),
      description,
      markedAsRead: false,
      ownerId,
      reviewFlagsId: reviewId
    };

    // create flag
    request.post({
      url,
      json: true,
      body: reviewGroupBody
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
 * Like a review
 */
function likeReview(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const profileId = params.profileId;
    const reviewId = params.reviewId;
    const value = '1'; //  like=1, dislike=-1

    const url = endpoint + 'api/reviews/' + reviewId + '/likes?access_token=' + accessToken;
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

/**
 * unlike a review 
 */
function unlikeReview(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const profileId = params.profileId;
    const reviewId = params.reviewId;
    const value = '1'; //  like=1, dislike=-1

    const url = endpoint + 'api/reviews/' + reviewId + '/likes?access_token=' + accessToken;
    const likeReviewBody = {
      value,
      profileId
    };

    const requestParams = {
      url,
      json: true,
      body: likeReviewBody
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
 * Mark a reviewt as deleted
 */
function markReviewAsDeleted(endpoint, params) {
  return new Promise((resolve, reject) => {

    const accessToken = params.accessToken;
    const reviewId = params.id;

    const url = endpoint + 'api/reviews/' + reviewId + '?access_token=' + accessToken;

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


function getReviews(endpoint, params) {
  return new Promise((resolve) => {
    const filter_str = JSON.stringify(params.filter || []);
    const url = endpoint + 'api/reviews/?filter=' + filter_str;
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

function createReview(endpoint, params) {
  return new Promise((resolve, reject) => {
    const url = endpoint + 'api/reviews?';
    const postBody = {
      id: params.id || null,
      pid: params.pid,
      libraryid: params.libraryid,
      content: params.content,
      created: params.created,
      modified: params.modified,
      worktype: params.worktype,
      reviewownerid: params.reviewownerid,
      rating: params.rating,
      image: params.image
    };

    if (params.video) {
      postBody.mimetype = params.video.mimetype || null;
      postBody.videofile = params.video.videofile || null;
      postBody.container = params.video.container || null;
    }

    if (params.id) {
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
    }
    else {
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
    }
  });
}

function checkForMemberInGroup(endpoint, {groupId, profileId}) {
  return promiseRequest('get', {
    url: `${endpoint}api/Groups/${groupId}/members/${profileId}`
  });
}

function getUserQuarantines(endpoint, {uid, filter}) {
  filter = encodeURIComponent(JSON.stringify(filter || {}));

  return promiseRequest('get', {
    url: `${endpoint}api/Profiles/${uid}/quarantines?filter=${filter}`
  });
}

/**
 * This function creates a listener on quarantines
 * @param {String} endpoint
 * @param {Object} logger
 * @param {Function || Array} callback
 * @returns {Promise}
 */
function listenForNewQuarantines(endpoint, logger, callback) {
  if (!callback || (typeof callback !== 'function' && !Array.isArray(callback))) {
    return Promise.reject('Callback needs to be a function!');
  }

  return changeStreamListener(endpoint, 'Quarantines', callback, logger);
}

/**
 * This function creates a change stream listener on posts
 * @param {String} endpoint
 * @param {Object} logger
 * @param {Function || Array} callback
 * @returns {Promise}
 */
function listenForNewPosts(endpoint, logger, callback) {
  if (!callback || (typeof callback !== 'function' || Array.isArray(callback))) {
    return Promise.reject('Callback needs to be a function!');
  }

  return changeStreamListener(endpoint, 'Posts', callback, logger);
}

/**
 * This function creates a change stream listener on posts
 * @param {String} endpoint
 * @param {Object} logger
 * @param {Function || Array} callback
 * @returns {Promise}
 */
function listenForNewComments(endpoint, logger, callback) {
  if (!callback || (typeof callback !== 'function' || Array.isArray(callback))) {
    return Promise.reject('Callback needs to be a function!');
  }

  return changeStreamListener(endpoint, 'Comments', callback, logger);
}

/**
 * Setting the necessary paramerters for the client to be usable.
 * The endpoint is only set if endpoint is null to allow setting it through
 * environment variables.
 *
 * @param {Object} config Config object with the necessary parameters to use
 * the webservice
 */
module.exports = function CommunityClient(logger, config = null) {

  if (!config || !config.endpoint) {
    throw new Error('Expected config object but got null or no endpoint provided');
  }

  return {
    listenForNewQuarantines: listenForNewQuarantines.bind(null, config.endpoint, logger),
    listenForNewPosts: listenForNewPosts.bind(null, config.endpoint, logger),
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
    flagReview: flagReview.bind(null, config.endpoint),
    createPost: createPost.bind(null, config.endpoint),
    createComment: createComment.bind(null, config.endpoint),
    createGroup: createGroup.bind(null, config.endpoint),
    updateGroup: updateGroup.bind(null, config.endpoint),
    countComments: countComments.bind(null, config.endpoint),
    countGroups: countGroups.bind(null, config.endpoint),
    countPosts: countPosts.bind(null, config.endpoint),
    countReviews: countReviews.bind(null, config.endpoint),
    likePost: likePost.bind(null, config.endpoint),
    likeReview: likeReview.bind(null, config.endpoint),
    unlikePost: unlikePost.bind(null, config.endpoint),
    unlikeReview: unlikeReview.bind(null, config.endpoint),
    markPostAsDeleted: markPostAsDeleted.bind(null, config.endpoint),
    markReviewAsDeleted: markReviewAsDeleted.bind(null, config.endpoint),
    getReviews: getReviews.bind(null, config.endpoint),
    checkForMemberInGroup: checkForMemberInGroup.bind(null, config.endpoint),
    getUserQuarantines: getUserQuarantines.bind(null, config.endpoint),
    createReview: createReview.bind(null, config.endpoint)
  };
};
