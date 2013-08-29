
var path      = require('path'),
    rootPath  = path.normalize(__dirname + '/..'); 

module.exports = {
  production: {
    db: process.env.MONGO_URL,
    root: rootPath,
    app: {
      name: 'Copenhagen Node.js Hackathon'
    },
    github: {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK
    }
  }
};
