'use strict';

var async = require('async'),
_         = require('underscore'),
mongoose  = require('mongoose'),
Project   = mongoose.model('Project'),
gh        = require('../../lib/github');

exports.index = function (req, res) {
  var activity = {};

  async.auto({
    projects: function (callback) {
      Project.find({"github": /^http/}).exec(function (err, projects) {
        activity.projects = projects;
        callback(null, projects);
      });
    },

    commits: [ "projects", function (callback) {
      if (req.user && req.user.githubAccessToken) {
        var tasks = [];
        _.each(activity.projects, function (project) {
          console.log(project.user);
          if (project.user && project.user.githubAccessToken) {
            var github = gh.getGitHubApi(project.user.githubAccessToken),
                parts = project.github.split("/").slice(-2),
                user = parts[0],
                repo = parts[1];

            tasks.push(function (callback) {
              github.repos.getCommits({
                "user": user,
                "repo": repo
              }, function (err, result) {
                // Adds repo to each commit
                result.forEach(function (e) {
                  e.repo = user + "/" + repo;
                });
                
                callback(null, result);
              });
            });
          }
        });
      }

      if(tasks !== undefined) {
        async.parallelLimit(tasks, 5, function (err, results) {
          callback(null, results);
        });
      }
    }]
  }, function (err, results) {
    res.jsonp(results.commits);
  });

};
