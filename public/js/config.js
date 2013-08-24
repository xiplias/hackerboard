//Setting up route
window.app.config(['$routeProvider', function ($routeProvider) {
	$routeProvider.
	when('/projects', { templateUrl: 'views/projects/list.html' }).
	when('/projects/new', { templateUrl: 'views/projects/create.html', loginRequred: true }).
	when('/projects/:projectId/edit', { templateUrl: 'views/projects/edit.html', loginRequred: true }).
	when('/projects/:projectId', { templateUrl: 'views/projects/view.html' }).
	when('/', { templateUrl: 'views/index.html' }).
  otherwise({redirectTo: '/'});
}]);

//Removing tomcat unspported headers
window.app.config(['$httpProvider', function ($httpProvider, Configuration) {
  //delete $httpProvider.defaults.headers.common["X-Requested-With"];
}]);

//Setting HTML5 Location Mode
window.app.config(['$locationProvider', function ($locationProvider) {
   //$locationProvider.html5Mode(true);
  $locationProvider.hashPrefix("!");
}]);
