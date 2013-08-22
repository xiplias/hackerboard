
var path = require('path')
  , rootPath = path.normalize(__dirname + '/..')

module.exports = {
  development: {
    db: 'mongodb://localhost/hackerboard-dev',
    root: rootPath,
    app: {
      name: 'Copenhagen Node - Development'
    },
    github: {
      clientID: '77c4b42a63e4ee524d17',
      clientSecret: '2def3795fdc3a5924dacef30ad84728c5bd6449c',
      callbackURL: 'http://localhost:3000/auth/github/callback'
    },
  },
  test: {
    db: 'mongodb://localhost/hackerboard-test',
    root: rootPath,
    app: {
      name: 'Copenhagen Node - Test'
    },
    github: {
      clientID: 'APP_ID',
      clientSecret: 'APP_SECRET',
      callbackURL: 'http://localhost:3000/auth/github/callback'
    },
  },
  production: {
    db: 'mongodb://localhost/hackerboard',
    root: rootPath,
    app: {
      name: 'Copenhagen Node'
    },
    github: {
      clientID: 'APP_ID',
      clientSecret: 'APP_SECRET',
      callbackURL: 'http://localhost:3000/auth/github/callback'
    }
  }
}
