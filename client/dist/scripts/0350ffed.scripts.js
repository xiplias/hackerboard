window.app = angular.module('MEAN', [
  'ngCookies',
  'ngResource',
  'ui.bootstrap'
]);
window.app.config([
  '$routeProvider',
  function ($routeProvider) {
    $routeProvider.when('/projects', { templateUrl: 'views/projects/list.html' }).when('/projects/new', {
      templateUrl: 'views/projects/create.html',
      loginRequred: true
    }).when('/projects/:projectId/edit', {
      templateUrl: 'views/projects/edit.html',
      loginRequred: true
    }).when('/projects/:projectId', { templateUrl: 'views/projects/view.html' }).when('/', { templateUrl: 'views/index.html' }).otherwise({ redirectTo: '/' });
  }
]);
window.app.config([
  '$httpProvider',
  function ($httpProvider, Configuration) {
  }
]);
window.app.config([
  '$locationProvider',
  function ($locationProvider) {
    $locationProvider.hashPrefix('!');
  }
]);
app.filter('showdown', function () {
  return function (markdown) {
    if (markdown) {
      var showdown = new Showdown.converter();
      return showdown.makeHtml(markdown);
    } else {
      return '';
    }
  };
});
app.filter('fromNow', function () {
  return function (date) {
    return moment(date).fromNow();
  };
});
window.app.factory('Global', function () {
  var _this = this;
  _this._data = {
    user: window.user,
    authenticated: !!window.user
  };
  return _this._data;
});
'use strict';
window.app.factory('Projects', function ($resource) {
  return $resource('projects/:projectId', { projectId: '@_id' }, { update: { method: 'PUT' } });
});
window.app.factory('ProjectMembers', function ($resource) {
  return $resource('projects/:projectId/members/:memberId', {
    projectId: '@_id',
    memberId: '@_id'
  }, { update: { method: 'PUT' } });
});
function MainController($scope, $rootScope, Global, $http) {
  $rootScope.$on('$routeChangeStart', function (event, next) {
  });
  $http.get('/users/me').success(function (result) {
    Global.user = result;
  });
}
function ProjectsController($scope, $rootScope, $window, $routeParams, $http, $location, Global, Projects) {
  $scope.global = Global;
  $scope.tags = [];
  $http.get('/users/me/repositories').success(function (result) {
    $scope.repos = result;
  });
  $scope.create = function () {
    var project = new Projects({
        title: this.title,
        content: this.content,
        short: this.short,
        github: this.github
      });
    project.$save(function (response) {
      $scope.projects = $scope.find();
      $location.path('projects/' + response._id);
    });
  };
  $scope.isSelected = function (project) {
    return project._id === $routeParams.projectId;
  };
  $scope.remove = function (project) {
    project.$remove();
    for (var i in $scope.projects) {
      if ($scope.projects[i] === project) {
        $scope.projects.splice(i, 1);
      }
    }
  };
  $scope.update = function () {
    var project = $scope.project;
    if (!project.updated) {
      project.updated = [];
    }
    project.updated.push(new Date().getTime());
    project.$update(function () {
      $scope.projects = $scope.find();
      $location.path('projects/' + project._id);
    });
  };
  $scope.find = function (query) {
    Projects.query(query, function (projects) {
      $scope.projects = projects;
    });
    console.log(Global, $scope.global);
  };
  $scope.findOne = function () {
    Projects.get({ projectId: $routeParams.projectId }, function (project) {
      $scope.project = project;
    });
  };
  $scope.activity = function () {
    $http.get('/activity').success(function (result) {
      console.log(result);
      $scope.activities = result;
    });
  };
}
function HeaderController($scope, $location, Global) {
  $scope.global = Global;
  $scope.user = window.user;
}
function LoginModalController($scope, $location, Global) {
  Global.openLoginModal = function () {
    $scope.shouldBeOpen = true;
  };
  $scope.close = function () {
    $scope.closeMsg = 'I was closed at: ' + new Date();
    $scope.shouldBeOpen = false;
  };
  $scope.opts = {
    backdropFade: true,
    dialogFade: true
  };
}
window.bootstrap = function () {
  angular.bootstrap(document, ['MEAN']);
};
window.init = function () {
  window.bootstrap();
};
$(document).ready(function () {
  window.init();
});