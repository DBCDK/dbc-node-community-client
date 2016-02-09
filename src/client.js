'use strict';

import request from 'request'; // eslint-disable-line

/**
 * Verifies a Profile in Loopback using verification token sent by email.
 */
/*
function verifyEmail(endpoint, params) {
  return new Promise((resolve) => {
    const url = endpoint + 'api/Profiles/confirm';

    request.get({
      url: url,
      qs: params
    }, (err, httpResponse) => {
      resolve(httpResponse);
    });
  });
}
*/

/**
 * Creates a new Profile in Loopback
 */
/*
function createProfile(endpoint, params) {
  return new Promise((resolve) => {
    const url = endpoint + 'api/Profiles';
    request.post(
      {
        url: url,
        form: params
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Fetches a Profile in Loopback
 */
/*
function getProfile(endpoint, params) {
  return new Promise((resolve) => {
    const id = params.id;
    const accessToken = params.accessToken;
    const filter_str = JSON.stringify({include: ['likes', 'groups']});
    const url = endpoint + 'api/Profiles/' + id + '?access_token=' + accessToken + '&filter=' + filter_str;
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
 * Creates a new Group in Loopback
 */
/*
function createGroup(endpoint, params) {
  return new Promise((resolve) => {
    const url = endpoint + 'api/Groups';
    request.post(
      {
        url: url,
        form: params
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Makes a Profile member of a Group in Loopback
 */
/*
function joinGroup(endpoint, params) {
  return new Promise((resolve) => {
    const groupId = params.groupId;
    const memberId = params.memberId;
    const url = endpoint + 'api/Groups/' + groupId + '/members/rel/' + memberId;
    request.put(
      {
        url: url,
        form: params
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Remove a Profile member from a Group in Loopback
 */
/*
function leaveGroup(endpoint, params) {
  return new Promise((resolve) => {
    const groupId = params.groupId;
    const memberId = params.memberId;
    const url = endpoint + 'api/Groups/' + groupId + '/members/rel/' + memberId;
    request.del(
      {
        url: url,
        form: params
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Persist Group to Loopback
 */
/*
function updateGroup(endpoint, params) {
  const id = params.id;
  const accessToken = params.accessToken;
  return new Promise((resolve) => {
    const url = endpoint + 'api/Groups/' + id + '?access_token=' + accessToken;
    request.put(
      {
        url: url,
        body: JSON.stringify(params),
        json: true
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Fetches a Group in Loopback
 */
/*
function getGroup(endpoint, params) {
  return new Promise((resolve) => {
    const id = params.id; // {include: ['owner', {comments: ['owner']}]}
    const filter_str = JSON.stringify({include: [{posts: ['owner', {comments: ['owner']}]}, 'members']});
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
 * Searches through Groups in Loopback
 */
/*
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
 * Create a Post
 */
/*
function createGroupPost(endpoint, params) {
  return new Promise((resolve, reject) => {
    const accessToken = params.accessToken;
    const groupId = params.groupId;
    const url = endpoint + 'api/Groups/' + groupId + '/posts?access_token=' + accessToken;
    const postBody = {
      title: params.title,
      content: params.content,
      timeCreated: (new Date()).toUTCString(),
      postownerid: params.postownerid
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
 * Gets a specific Post
 */
/*
function getGroupPost(endpoint, params) {
  return new Promise((resolve, reject) => {
    const accessToken = params.accessToken;
    const postId = params.postId;
    const filter_str = JSON.stringify({include: ['owner', {comments: ['owner']}]});
    const url = endpoint + 'api/Posts/' + postId + '?access_token' + accessToken + '&filter=' + filter_str;
    request.get({url}, (err, res) => {
      if (err) {
        reject(err);
      }

      resolve(res);
    });
  });
}

/**
 * Update a specific Post
 */
/*
function updateGroupPost(endpoint, params) {
  return new Promise((resolve, reject) => {
    const accessToken = params.accessToken;
    const postId = params.postId;
    const url = endpoint + 'api/Posts/' + postId + '?access_token' + accessToken;
    const putBody = {
      title: params.title,
      content: params.content
    };
    request.put({
      url,
      json: true,
      body: JSON.stringify(putBody)
    }, (err, res) => {
      if (err) {
        reject(err);
      }

      resolve(res);
    });
  });
}

/**
 * Delete a specific Post
 */
/*
function removeGroupPost(endpoint, params) {
  return new Promise((resolve) => {
    const accessToken = params.accessToken;
    const postId = params.postId;
    const url = endpoint + 'api/Posts/' + postId + '?access_token' + accessToken;
    request.del({url}, (err, res) => {
      resolve(res.statusCode === 204);
    });
  });
}

/**
 * Comments on a post
 */
/*
function commentOnGroupPost(endpoint, params) {
  return new Promise((resolve, reject) => {
    const accessToken = params.accessToken;
    const postId = params.postId;
    const uid = params.uid;
    const commentContent = params.commentText;
    const url = endpoint + 'api/Comments?access_token' + accessToken;
    request.post({
      url,
      json: true,
      body: JSON.stringify({
        content: commentContent,
        timeCreated: (new Date()).toUTCString(),
        commentownerid: uid,
        postid: postId
      })
    }, (err, resp) => {
      if (err) {
        reject(err);
      }

      resolve(resp);
    });
  });
}

/**
 * Persist Profile to Loopback
 */
/*
function updateProfile(endpoint, params) {
  const id = params.id;
  const accessToken = params.accessToken;
  return new Promise((resolve) => {
    const url = endpoint + 'api/Profiles/' + id + '?access_token=' + accessToken;
    request.put(
      {
        url: url,
        body: params,
        json: true
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Login Profile in Loopback
 */
/*
function loginProfile(endpoint, params) {
  return new Promise((resolve) => {
    const url = endpoint + 'api/Profiles/login';
    request.post(
      {
        url: url,
        form: params
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * TODO: Comment this
 */
/*
function logoutProfile(endpoint, params) {
  return new Promise((resolve) => {
    const url = endpoint + 'api/Profiles/logout?access_token=' + params.accessToken;
    request.post(
      {
        url: url,
        params: {}
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Save a like on a users profile
 *
 * @param {object }params
 * @return {Promise}
 */
/*
function saveLike(endpoint, params) {
  const uid = params.uid;
  const accessToken = params.accessToken;
  const item_id = params.item_id;
  const value = params.value;

  return new Promise((resolve) => {
    const url = endpoint + 'api/Profiles/' + uid + '/likes?access_token=' + accessToken;
    request.post(
      {
        url: url,
        form: {
          item_id: item_id,
          value: value
        }
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Update a like on a users profile
 *
 * @param {object} params
 * @return {Promise}
 */
/*
function updateLike(endpoint, params) {
  const uid = params.uid;
  const accessToken = params.accessToken;
  const value = params.value;
  const id = params.id;

  return new Promise((resolve) => {
    const url = endpoint + 'api/Profiles/' + uid + '/likes/' + id + '?access_token=' + accessToken;
    request.put(
      {
        url: url,
        form: {
          value: value
        }
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Remove a like on a users profile
 *
 * @param {object} params
 * @return {Promise}
 */
/*
function removeLike(endpoint, params) {
  const uid = params.uid;
  const accessToken = params.accessToken;
  const id = params.id;

  return new Promise((resolve) => {
    const url = endpoint + 'api/Profiles/' + uid + '/likes/' + id + '?access_token=' + accessToken;
    request.del(
      {
        url: url,
        form: {}
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Remove all likes on a users profile
 *
 * @param {object} params
 * @return {Promise}
 */
/*
function resetLikes(endpoint, params) {
  const uid = params.uid;
  const accessToken = params.accessToken;

  return new Promise((resolve) => {
    const url = endpoint + 'api/Profiles/' + uid + '/likes?access_token=' + accessToken;
    request.del(
      {
        url: url,
        form: {}
      },
      (err, httpResponse) => {
        resolve(httpResponse);
      }
    );
  });
}

/**
 * Requests a specific user profile from the profile service.
 * @param {{agencyid: string, loanerid: string}} params
 * @see http://profile-i01.dbc.dk:3001/explorer/#!/MobilSoegProfiles/findMobilSoegProfile
 */
/*
function findMobilSoegProfile(endpoint, params) {
  const {loanerid, agencyid} = params;
  const url = `${endpoint}api/MobilSoegProfiles/findMobilSoegProfile`;

  return new Promise((resolve, reject) => {
    request.get(
      {
        url: url,
        json: {
          agencyid: agencyid,
          loanerid: loanerid
        }
      },
      (err, httpResponse) => {
        if (err) {
          reject({err: err, httpResponse: httpResponse});
        }
        else {
          resolve(httpResponse);
        }
      }
    );
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
export default function ProfileClient(config = null) {

  if (!config || !config.endpoint) {
    throw new Error('Expected config object but got null or no endpoint provided');
  }

  return {
    /*
    verifyEmail: verifyEmail.bind(null, config.endpoint),
    createProfile: createProfile.bind(null, config.endpoint),
    updateProfile: updateProfile.bind(null, config.endpoint),
    getProfile: getProfile.bind(null, config.endpoint),
    loginProfile: loginProfile.bind(null, config.endpoint),
    logoutProfile: logoutProfile.bind(null, config.endpoint),
    getGroup: getGroup.bind(null, config.endpoint),
    joinGroup: joinGroup.bind(null, config.endpoint),
    leaveGroup: leaveGroup.bind(null, config.endpoint),
    createGroup: createGroup.bind(null, config.endpoint),
    updateGroup: updateGroup.bind(null, config.endpoint),
    queryGroups: queryGroups.bind(null, config.endpoint),
    createGroupPost: createGroupPost.bind(null, config.endpoint),
    getGroupPost: getGroupPost.bind(null, config.endpoint),
    updateGroupPost: updateGroupPost.bind(null, config.endpoint),
    removeGroupPost: removeGroupPost.bind(null, config.endpoint),
    commentOnGroupPost: commentOnGroupPost.bind(null, config.endpoint),
    saveLike: saveLike.bind(null, config.endpoint),
    removeLike: removeLike.bind(null, config.endpoint),
    updateLike: updateLike.bind(null, config.endpoint),
    resetLikes: resetLikes.bind(null, config.endpoint),
    findMobilSoegProfile: findMobilSoegProfile.bind(null, config.endpoint)
    */
  };
}
