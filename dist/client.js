'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = CommunityClient;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _nodeUuid = require('node-uuid');

var _nodeUuid2 = _interopRequireDefault(_nodeUuid);

function promiseRequest(method, req) {
  return new Promise(function (resolve, reject) {
    _request2['default'][method](req, function (err, httpResponse) {
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

  return promiseRequest('post', {
    url: endpoint + 'api/Profiles/unilogin',
    form: { username: username, timestamp: timestamp, authtoken: authtoken, ttl: ttl }
  });
}

function checkIfUserProfileExists(endpoint, params) {
  return promiseRequest('post', {
    url: endpoint + 'api/Profiles/checkIfUserExists',
    form: {
      username: params.username
    }
  });
}

function checkIfDisplayNameIsTaken(endpoint, _ref2) {
  var displayname = _ref2.displayname;

  return promiseRequest('post', {
    url: endpoint + 'api/Profiles/checkIfDisplayNameIsTaken',
    form: {
      displayname: displayname
    }
  });
}

function createProfile(endpoint, _ref3) {
  var username = _ref3.username;

  return promiseRequest('post', {
    url: endpoint + 'api/Profiles',
    json: {
      username: username,
      created: Date.now(),
      lastUpdated: Date.now()
    }
  });
}

function updateProfile(endpoint, _ref4) {
  var uid = _ref4.uid;
  var profile = _ref4.profile;
  var accessToken = _ref4.accessToken;

  return promiseRequest('put', {
    url: endpoint + 'api/Profiles/' + uid + '?access_token=' + accessToken,
    body: profile,
    json: true
  });
}

function removeImage(endpoint, _ref5) {
  var imageId = _ref5.imageId;
  var accessToken = _ref5.accessToken;

  return promiseRequest('del', {
    url: endpoint + 'api/ImageCollections/' + imageId + '?access_token=' + accessToken
  });
}

function updateImage(endpoint, _ref6) {
  var image = _ref6.image;
  var relationId = _ref6.relationId;
  var relationType = _ref6.relationType;
  var accessToken = _ref6.accessToken;

  var fileExtension = image.originalname.split('.');
  fileExtension = fileExtension[fileExtension.length - 1];
  var fileName = _nodeUuid2['default'].v4().replace('-', '') + '.' + fileExtension;

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
  }).then(function (res) {
    var remoteFileObject = JSON.parse(res.body);
    var bodyObj = {};
    bodyObj[relationType] = relationId;
    return promiseRequest('put', {
      url: endpoint + 'api/ImageCollections/' + remoteFileObject.id + '?access_token=' + accessToken,
      json: true,
      body: bodyObj
    });
  });
}

/**
 * Get Full profile (that is userprofile + image)
 * @param endpoint
 * @param uid
 * @param accessToken
 * @param profileFilter
 */
function getFullProfile(endpoint, _ref7) {
  var uid = _ref7.uid;
  var accessToken = _ref7.accessToken;
  var profileFilter = _ref7.profileFilter;

  var filter = {
    include: ['image']
  };

  if (profileFilter) {
    filter = Object.assign(filter, profileFilter);
  }

  return promiseRequest('get', {
    url: endpoint + 'api/Profiles/' + uid + '?filter=' + encodeURIComponent(JSON.stringify(filter)) + '&access_token=' + accessToken
  });
}

function getImage(endpoint, _ref8) {
  var id = _ref8.id;

  return promiseRequest('get', {
    url: endpoint + 'api/files/' + id
  });
}

function getResizedImage(endpoint, _ref9) {
  var id = _ref9.id;
  var size = _ref9.size;

  return promiseRequest('get', {
    url: endpoint + 'api/imageCollections/' + id + '/download/' + size
  });
}

function joinGroup(endpoint, _ref10) {
  var uid = _ref10.uid;
  var groupId = _ref10.groupId;
  var accessToken = _ref10.accessToken;

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
  return new Promise(function (resolve) {
    var filter_str = JSON.stringify(params.filter || []);
    var url = endpoint + 'api/Groups/?filter=' + filter_str;
    _request2['default'].get({
      url: url
    }, function (err, httpResponse) {
      resolve(httpResponse);
    });
  });
}

function leaveGroup(endpoint, _ref11) {
  var uid = _ref11.uid;
  var groupId = _ref11.groupId;
  var accessToken = _ref11.accessToken;

  return promiseRequest('del', {
    url: endpoint + 'api/Profiles/' + uid + '/groups/rel/' + groupId + '?access_token=' + accessToken,
    json: true
  });
}

function createGroup(endpoint, params) {
  var name = params.name;
  var description = params.description;
  var colour = params.colour;
  var coverImage = params.coverImage;
  var uid = params.uid;
  var accessToken = params.accessToken;

  return promiseRequest('post', {
    url: endpoint + 'api/Groups?access_token' + accessToken,
    json: true,
    body: {
      name: name,
      description: description,
      colour: colour,
      timeCreated: new Date().toUTCString(),
      groupownerid: uid
    }
  }).then(function (createResult) {
    var fileExtension = coverImage.originalname.split('.');
    fileExtension = fileExtension[fileExtension.length - 1];
    var fileName = _nodeUuid2['default'].v4().replace('-', '') + '.' + fileExtension;

    joinGroup(endpoint, {
      uid: uid,
      groupId: createResult.body.id,
      accessToken: accessToken
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
    }).then(function (fileResult) {
      fileResult = JSON.parse(fileResult.body);
      return promiseRequest('put', {
        url: endpoint + 'api/ImageCollections/' + fileResult.id + '?access_token=' + accessToken,
        json: true,
        body: {
          groupCoverImageCollectionId: createResult.body.id
        }
      }).then(function (updatedFileResult) {
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
function updateGroup(endpoint, _ref12) {
  var groupId = _ref12.groupId;
  var name = _ref12.name;
  var description = _ref12.description;
  var colour = _ref12.colour;
  var coverImage = _ref12.coverImage;
  var uid = _ref12.uid;
  var accessToken = _ref12.accessToken;
  var isModerator = _ref12.isModerator;

  if (!accessToken) {
    return Promise.reject('Please provide an access token!');
  }

  return promiseRequest('get', {
    url: endpoint + 'api/Groups/' + groupId + '?access_token=' + accessToken,
    json: true
  }).then(function (groupGetResponse) {
    var group = groupGetResponse.body;
    if (!isModerator && group.groupownerid !== uid) {
      return Promise.reject('User does not own the group!');
    }

    var promises = [];

    promises.push(promiseRequest('put', {
      url: endpoint + 'api/Groups/' + groupId + '?access_token=' + accessToken,
      json: true,
      body: {
        name: name,
        description: description,
        colour: colour
      }
    }));

    if (coverImage) {
      var fileExtension = coverImage.originalname.split('.');
      fileExtension = fileExtension[fileExtension.length - 1];
      var fileName = _nodeUuid2['default'].v4().replace('-', '') + '.' + fileExtension;

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

    return Promise.all(promises).then(function (promiseResponses) {
      var createResult = promiseResponses[0];

      if (promiseResponses[1]) {
        var fileResult = JSON.parse(promiseResponses[1].body);
        return promiseRequest('put', {
          url: endpoint + 'api/ImageCollections/' + fileResult.id + '?access_token=' + accessToken,
          json: true,
          body: {
            groupCoverImageCollectionId: createResult.body.id
          }
        }).then(function (updatedFileResult) {
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
  return new Promise(function (resolve) {
    var id = params.id;
    var filter_str = JSON.stringify(params.filter || {});
    var url = endpoint + 'api/Groups/' + id + '?filter=' + filter_str;
    _request2['default'].get({
      url: url
    }, function (err, httpResponse) {
      resolve(httpResponse);
    });
  });
}

/**
 * Fetches a posts for a group in Loopback
 */
function getPosts(endpoint, params) {
  return new Promise(function (resolve) {
    var filter_str = JSON.stringify(params.filter || {});
    var url = endpoint + 'api/Posts/?filter=' + filter_str;
    _request2['default'].get({
      url: url
    }, function (err, httpResponse) {
      resolve(httpResponse);
    });
  });
}
/**
 * Fetches a comments for a post in Loopback
 */
function getComments(endpoint, params) {
  return new Promise(function (resolve) {
    var filter_str = JSON.stringify(params.filter || {});
    var url = endpoint + 'api/Comments/?filter=' + filter_str;
    _request2['default'].get({
      url: url
    }, function (err, httpResponse) {
      resolve(httpResponse);
    });
  });
}

/**
 * Get all comments (not necessarily related to a specific post).
 */
function getAllComments(endpoint, params) {
  var filter = JSON.stringify(params.filter || {});
  return promiseRequest('get', {
    url: endpoint + 'api/Comments/?filter=' + filter
  });
}

/**
 * Searches through Groups in Loopback
 */
function queryGroups(endpoint, params) {
  return new Promise(function (resolve, reject) {
    var accessToken = params.accessToken;
    var pattern = new RegExp('.*' + params.query + '.*', 'i');
    var filter_str = JSON.stringify({ where: { name: { regexp: pattern.toString() } }, include: ['members'] });
    var url = endpoint + 'api/Groups?access_token=' + accessToken + '&filter=' + filter_str;
    _request2['default'].get({ url: url }, function (err, res) {
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
  return new Promise(function (resolve, reject) {
    var accessToken = params.accessToken;
    var groupId = params.parentId;
    var url = endpoint + 'api/Posts?access_token=' + accessToken;
    var postBody = {
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

    _request2['default'].put({
      url: url,
      json: true,
      body: postBody
    }, function (err, res) {
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
  return new Promise(function (resolve, reject) {
    var accessToken = params.accessToken;
    var postId = params.parentId;
    var url = endpoint + 'api/Comments?access_token=' + accessToken;
    var postBody = {
      title: params.title,
      content: params.content,
      timeCreated: params.timeCreated,
      commentownerid: params.ownerid,
      commentcontainerpostid: postId,
      postid: postId,
      id: params.id || null
    };

    _request2['default'].put({
      url: url,
      json: true,
      body: postBody
    }, function (err, res) {
      if (err) {
        reject(err);
      }

      resolve(res);
    });
  });
}

function countComments(endpoint, _ref13) {
  var accessToken = _ref13.accessToken;
  var where = _ref13.where;

  return promiseRequest('get', endpoint + 'api/Comments/count?access_token=' + accessToken + (where ? '&where=' + JSON.stringify(where) : ''));
}

function countPosts(endpoint, _ref14) {
  var accessToken = _ref14.accessToken;
  var where = _ref14.where;

  return promiseRequest('get', endpoint + 'api/Posts/count?access_token=' + accessToken + (where ? '&where=' + JSON.stringify(where) : ''));
}

function countGroups(endpoint, _ref15) {
  var accessToken = _ref15.accessToken;
  var where = _ref15.where;

  return promiseRequest('get', endpoint + 'api/Groups/count?access_token=' + accessToken + (where ? '&where=' + JSON.stringify(where) : ''));
}

/**
 * Flag a Post
 */
function flagPost(endpoint, params) {
  return new Promise(function (resolve, reject) {

    var accessToken = params.accessToken;
    var postId = params.postId;
    var ownerId = params.flagger;
    var description = params.description;

    // Create flag
    var url = endpoint + 'api/Flags?access_token=' + accessToken;
    var flagPostBody = {
      timeFlagged: Date.now(),
      description: description,
      markedAsRead: false,
      ownerId: ownerId,
      postFlagsId: postId
    };

    // create flag
    _request2['default'].post({
      url: url,
      json: true,
      body: flagPostBody
    }, function (err, res) {
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
  return new Promise(function (resolve, reject) {

    var accessToken = params.accessToken;
    var commentId = params.commentId;
    var ownerId = params.flagger;
    var description = params.description;

    // Create flag
    var url = endpoint + 'api/Flags?access_token=' + accessToken;
    var flagCommentBody = {
      timeFlagged: Date.now(),
      description: description,
      markedAsRead: false,
      ownerId: ownerId,
      commentFlagsId: commentId
    };

    // create flag
    _request2['default'].post({
      url: url,
      json: true,
      body: flagCommentBody
    }, function (err, res) {
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
  return new Promise(function (resolve, reject) {

    var accessToken = params.accessToken;
    var groupId = params.groupId;
    var ownerId = params.flagger;
    var description = params.description;

    // Create flag
    var url = endpoint + 'api/Flags?access_token=' + accessToken;
    var flagGroupBody = {
      timeFlagged: Date.now(),
      description: description,
      markedAsRead: false,
      ownerId: ownerId,
      groupFlagsId: groupId
    };

    // create flag
    _request2['default'].post({
      url: url,
      json: true,
      body: flagGroupBody
    }, function (err, res) {
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
  return new Promise(function (resolve, reject) {

    var accessToken = params.accessToken;
    var profileId = params.profileId;
    var postId = params.postId;
    var value = '1'; //  like=1, dislike=-1

    var url = endpoint + 'api/Posts/' + postId + '/likes?access_token=' + accessToken;
    var likePostBody = {
      value: value,
      profileId: profileId
    };

    var requestParams = {
      url: url,
      json: true,
      body: likePostBody
    };

    // create like
    _request2['default'].post(requestParams, function (err, res) {
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
  return new Promise(function (resolve, reject) {

    var accessToken = params.accessToken;
    var profileId = params.profileId;
    var postId = params.postId;
    var value = '1'; //  like=1, dislike=-1

    var url = endpoint + 'api/Posts/' + postId + '/likes?access_token=' + accessToken;
    var likePostBody = {
      value: value,
      profileId: profileId
    };

    var requestParams = {
      url: url,
      json: true,
      body: likePostBody
    };

    // create like
    _request2['default'].del(requestParams, function (err, res) {
      if (err) {
        reject(err);
      }
      resolve(res);
    });
  });
}

function checkIfProfileIsQuarantined(endpoint, id) {
  return promiseRequest('get', { url: endpoint + 'api/Quarantines/' + id + '/check-if-profile-is-quarantined' });
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
    unlikePost: unlikePost.bind(null, config.endpoint)
  };
}

module.exports = exports['default'];