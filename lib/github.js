'use strict'

var gitHubApi = require('github'),
  config    = require('../config/config')[process.env.NODE_ENV || 'development']

exports.getGitHubApi = function (token) {
  var github = new gitHubApi({
      version: "3.0.0",
      timeout: 5000
  });
  github.authenticate({
      type: "oauth",

      token: token
  });
  return github;
};
