
/*
 *  Generic require login routing middleware
 */

exports.requiresLogin = function (req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/login')
  }
  next()
};


/*
 *  User authorizations routing middleware
 */

exports.user = {
    hasAuthorization : function (req, res, next) {
      if (req.profile.id != req.user.id) {
        return res.redirect('/users/'+req.profile.id)
      }
      next()
    }
}


/*
 *  Project authorizations routing middleware
 */

exports.project = {
    hasAuthorization : function (req, res, next) {
      if (req.project.user.id != req.user.id) {
        return res.redirect('/projects/'+req.project.id)
      }
      next()
    }
}
