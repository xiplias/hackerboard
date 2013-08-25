'use strict';

var async = require('async'),
_         = require('underscore'),
mongoose  = require('mongoose'),
Project   = mongoose.model('Project'),
gh        = require('../../lib/github'),
User      = mongoose.model('User');

exports.index = function (req, res) {
  var activity = {};

  async.auto({
    projects: function (callback) {
      Project.find({"github": /^http/}).exec(function (err, projects) {
        if (err) throw err;

        activity.projects = projects || [];
        callback(null, projects);
      });
    },

    commits: [ "projects", function (callback) {      
      activity.projects.forEach(function (project) {
        User.findOne({_id : project.user}, function(err, user) {
          if (err) throw err;

          if (user && user.githubAccessToken) {
            var github = gh.getGitHubApi(user.githubAccessToken),
                parts = project.github.split("/").slice(-2),
                user = parts[0],
                repo = parts[1];

            github.repos.getCommits({
              "user": user,
              "repo": repo
            }, function (err, result) {
              if (err) throw err;
              console.log("hey");
              // Adds repo to each commit
              result.forEach(function (e) {
                e.repo = user + "/" + repo;
              });
              
              callback(null, result);
            });
          }
        });
      });
    }]
  }, function (err, results) {
    if (err) throw err;
    res.jsonp(results.commits);
  });

};
