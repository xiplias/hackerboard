var shared = function(config) {
  config.set({
    basePath: '../',
    frameworks: ['mocha'],
    reporters: ['progress'],
    browsers: ['Chrome'],
    autoWatch: true,

    // these are default values anyway
    singleRun: false,
    colors: true,
  });
};

shared.files = [
  'test/mocha.conf.js',
  
  //3rd Party Code
  'public/lib/angular/index.js',

  //App-specific Code
  'public/js/config.js',
  'public/js/services/**/*.js',
  'public/js/directives.js',
  'public/js/controllers/**/*.js',
  'public/js/filters.js',
  'public/js/app.js',
  'public/js/init.js',

  //Test-Specific Code
  'node_modules/chai/chai.js',
  'test/lib/chai-should.js',
  'test/lib/chai-expect.js'
];

module.exports = shared;