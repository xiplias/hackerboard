
/**
 * Module dependencies.
 */

var mongoose  = require('mongoose'),
    User      = mongoose.model('User'),
    gitHubApi = require('github'),
    _         = require('underscore');

exports.authCallback = function (req, res) {
  res.redirect('/');
};

exports.signin = function (req, res) {
  res.render('users/signin', {
    title: 'Signin',
    message: req.flash('error')
  });
};

exports.signup = function (req, res) {
  res.render('users/signup', {
    title: 'Sign up',
    user: new User()
  });
};

exports.signout = function (req, res) {
  req.logout();
  res.redirect('/');
};

exports.me = function (req, res) {
  res.jsonp(req.user || null);
};

exports.user = function (req, res, next, id) {
  User
    .findOne({ _id : id })
    .exec(function (err, user) {
      if (err) return next(err);
      if (!user) return next(new Error('Failed to load User ' + id));
      req.profile = user;
      next();
    });
};

/**
 * Pull a  listing of the currently logged in users github repositories
 */
exports.repositories = function (req, res) {
  var github = new gitHubApi({
    version: "3.0.0",
    timeout: 5000
  });

  github.repos.getFromUser({"user": req.user.username}, function (err, result) {
    var repos = [];

    _.each(result, function (elm) {
      repos.push(elm.full_name);
    });

    res.jsonp(repos);
  });
};
