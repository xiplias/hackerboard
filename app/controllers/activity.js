'use strict';

var async = require('async'),
mongoose  = require('mongoose'),
Project   = mongoose.model('Project'),
gh        = require('../../lib/github'),
User      = mongoose.model('User'),
common    = require('common');

exports.index = function (req, res) {
  common.step([
    function (next) {
      Project.find({ github: { $exists: true }}).exec(next);
    },
    function (projects, next) {
      this.projects = projects;
      projects.forEach(function (project) {
        User.findOne({_id : project.user}, next.parallel());
      });
    },
    function (users, next) {
      var that = this;
      users.forEach(function (user, index) {
        if (!user || !user.githubAccessToken) return;
        var github = gh.getGitHubApi(user.githubAccessToken),
            parts = that.projects[index].github.split("/"),
            user = parts[0],
            repo = parts[1],
            parallel = next.parallel();

        github.repos.getCommits({
          "user": user,
          "repo": repo
        }, function (err, result) {
          if (err) return parallel(null, []);

          // Adds repo to each commit
          result.forEach(function (e) {
            e.repo = user + "/" + repo;
          });

          parallel(null, result);
        });
      });
    },
    function (results) {
      var commits = Array.prototype.concat.apply([], results);

      commits.sort(function (a,b) {
        return (new Date(b.commit.committer.date)).getTime() - (new Date(a.commit.committer.date)).getTime();
      });

      res.jsonp(commits);
    }
  ], function (err) {
    if (err) throw err;
  });
};
