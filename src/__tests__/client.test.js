'use strict';

import {assert} from 'chai';
import ProfileClient from '../client.js';

describe('Test methods in client.js', () => {
  const methods = ProfileClient({endpoint: 'some_url'});
  
  /*
  it('Should ensure createProfile is present', () => {
    assert.isFunction(methods.createProfile, 'createProfile was found');
  });

  it('Should ensure getProfile is present', () => {
    assert.isFunction(methods.getProfile, 'getProfile was found');
  });

  it('Should ensure updateProfile is present', () => {
    assert.isFunction(methods.updateProfile, 'updateProfile was found');
  });

  it('Should ensure loginProfile is present', () => {
    assert.isFunction(methods.loginProfile, 'loginProfile was found');
  });

  it('Should ensure logoutProfile is present', () => {
    assert.isFunction(methods.logoutProfile, 'logoutProfile was found');
  });

  it('Should ensure saveLike is present', () => {
    assert.isFunction(methods.saveLike, 'saveLike was found');
  });

  it('Should ensure updateLike is present', () => {
    assert.isFunction(methods.updateLike, 'updateLike was found');
  });

  it('Should ensure removeLike is present', () => {
    assert.isFunction(methods.removeLike, 'removeLike was found');
  });
  */

  it('Should throw when no config object is provided to init', () => {
    assert.throws(ProfileClient, Error, 'Expected config object but got null or no endpoint provided');
  });

  it('Should throw when config object is provided but no endpoint to init', () => {
    assert.throws(() => ProfileClient({}), Error, 'Expected config object but got null or no endpoint provided');
  });
});
