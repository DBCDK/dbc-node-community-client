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

function updateImage(endpoint, _ref5) {
  var image = _ref5.image;
  var relationId = _ref5.relationId;
  var relationType = _ref5.relationType;
  var accessToken = _ref5.accessToken;

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
 */
function getFullProfile(endpoint, _ref6) {
  var uid = _ref6.uid;
  var accessToken = _ref6.accessToken;

  return promiseRequest('get', {
    url: endpoint + 'api/Profiles/' + uid + '?filter=%7B%22include%22%3A%5B%22image%22%5D%7D&access_token=' + accessToken
  });
}

function getImage(endpoint, _ref7) {
  var id = _ref7.id;

  return promiseRequest('get', {
    url: endpoint + 'api/files/' + id
  });
}

function getResizedImage(endpoint, _ref8) {
  var id = _ref8.id;
  var size = _ref8.size;

  return promiseRequest('get', {
    url: endpoint + 'api/imageCollections/' + id + '/download/' + size
  });
}

function joinGroup(endpoint, _ref9) {
  var uid = _ref9.uid;
  var groupId = _ref9.groupId;
  var accessToken = _ref9.accessToken;

  return promiseRequest('put', {
    url: endpoint + 'api/Profiles/' + uid + '/groups/rel/' + groupId + '?access_token=' + accessToken,
    json: true
  });
}

function leaveGroup(endpoint, _ref10) {
  var uid = _ref10.uid;
  var groupId = _ref10.groupId;
  var accessToken = _ref10.accessToken;

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
          groupCoverImageId: createResult.body.id
        }
      }).then(function (updatedFileResult) {
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
  return new Promise(function (resolve) {
    var id = params.id;
    var filter_str = JSON.stringify({ include: params.filter || [] });
    var url = endpoint + 'api/Groups/' + id + '?filter=' + filter_str;
    _request2['default'].get({
      url: url
    }, function (err, httpResponse) {
      resolve(httpResponse);
    });
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
 */
function createPost(endpoint, params) {
  return new Promise(function (resolve, reject) {
    var accessToken = params.accessToken;
    var groupId = params.parentId;
    var url = endpoint + 'api/Groups/' + groupId + '/posts?access_token=' + accessToken;
    var postBody = {
      title: params.title,
      content: params.content,
      timeCreated: new Date().toUTCString(),
      postownerid: params.ownerid
    };

    _request2['default'].post({
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
    var url = endpoint + 'api/Posts/' + postId + '/comments?access_token=' + accessToken;
    var postBody = {
      title: params.title,
      content: params.content,
      timeCreated: new Date().toUTCString(),
      commentownerid: params.ownerid
    };

    _request2['default'].post({
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
    queryGroups: queryGroups.bind(null, config.endpoint),
    createPost: createPost.bind(null, config.endpoint),
    createComment: createComment.bind(null, config.endpoint),
    createGroup: createGroup.bind(null, config.endpoint)
  };
}

module.exports = exports['default'];