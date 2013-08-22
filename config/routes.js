
var async = require('async')

module.exports = function (app, passport, auth) {

  // user routes
  var users = require('../app/controllers/users')
  app.get('/login', users.signin)
  app.get('/signup', users.signup)
  app.get('/logout', users.signout)
  app.post('/users', users.create)
  app.post('/users/session', passport.authenticate('local', {failureRedirect: '/signin', failureFlash: 'Invalid email or password.'}), users.session)
  app.get('/users/me', users.me)
  app.get('/users/:userId', users.show)
  app.get('/auth/github', passport.authenticate('github', { failureRedirect: '/signin' }), users.signin)
  app.get('/auth/github/callback', passport.authenticate('github', { failureRedirect: '/signin' }), users.authCallback)

  app.param('userId', users.user)

  var articles = require('../app/controllers/articles')  
  app.get('/articles', articles.all)
  app.post('/articles', auth.requiresLogin, articles.create)
  app.get('/articles/:articleId', articles.show)
  app.put('/articles/:articleId', auth.requiresLogin, auth.article.hasAuthorization, articles.update)
  app.del('/articles/:articleId', auth.requiresLogin, auth.article.hasAuthorization, articles.destroy)

  app.param('articleId', articles.article)

  // home route
  var index = require('../app/controllers/index')
  app.get('/', index.render)

}
