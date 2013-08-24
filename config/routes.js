
var async = require('async')

module.exports = function (app, passport, auth) {

  // user routes
  var users = require('../app/controllers/users')
  app.get('/login', users.signin)
  app.get('/logout', users.signout)

  app.get('/auth/github', passport.authenticate('github', { failureRedirect: '/signin' }), users.signin)
  app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/signin' }), users.authCallback)

  app.param('userId', users.user)

  var projects = require('../app/controllers/projects')
  app.get('/projects', projects.all)
  app.post('/projects', auth.requiresLogin, projects.create)
  app.get('/projects/:projectId', projects.show)
  app.put('/projects/:projectId', auth.requiresLogin, auth.project.hasAuthorization, projects.update)
  app.del('/projects/:projectId', auth.requiresLogin, auth.project.hasAuthorization, projects.destroy)

  app.param('projectId', projects.project);

  // home route
  var index = require('../app/controllers/index');
  app.get('/', index.render);

}
