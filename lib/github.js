'use strict'

var gitHubApi = require('github'),
  config    = require('../config/config')[process.env.NODE_ENV || 'development']

exports.getGitHubApi = function (opts) {
  var github = new gitHubApi({
      version: "3.0.0",
      timeout: 5000
  });
  github.authenticate({
      type: "oauth",
      token: config.github.clientSecret
  });
  return github;
}
