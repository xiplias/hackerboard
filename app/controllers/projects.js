var mongoose  = require('mongoose'),
    Project   = mongoose.model('Project'),
    _         = require('underscore');

exports.project = function (req, res, next, id) {
  Project.load(id, function (err, project) {
    if (err) return next(err);
    if (!project) return next(new Error('Failed to load project ' + id));
    req.project = project;
    next();
  });
};

exports.create = function (req, res) {
  var project = new Project(req.body);
  project.user = req.user;
  project.save();
  res.jsonp(project);
};

exports.update = function (req, res) {
  var project = req.project;
  project = _.extend(project, req.body);

  project.save(function () {
    res.jsonp(project);
  });
};

/**
 * Delete an project
 */
exports.destroy = function (req, res) {
  var project = req.project;
  project.remove(function (err) {
    if (err) {
      res.render('error', {status: 500});
    } else {
      res.jsonp(project);
    }
  });
};

exports.show = function (req, res) {
  res.jsonp(req.project);
};

exports.all = function (req, res) {
	Project.find().sort('-created').populate('user').exec(function (err, projects) {
		if (err) {
			res.render('error', {status: 500});
		} else {
      res.jsonp(projects);
		}
	});
};
