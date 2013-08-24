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
      var github = gh.getGitHubApi(),
      tasks = {};
      _.each(activity.projects, function (project) {
        var parts = project.github.split("/").slice(-2),
        user = parts[0],
        repo = parts[1];

        tasks[user + '/' + repo] = function (callback) {
          github.repos.getCommits({
            "user": user,
            "repo": repo
          }, function (err, result) {
            callback(null, result);
          });
        };
      });

      async.parallelLimit(tasks, 5, function (err, results) {
        callback(null, results);
      });
    }]
  }, function (err, results) {
    res.jsonp({
      "commits": results.commits
    });
  });

};
