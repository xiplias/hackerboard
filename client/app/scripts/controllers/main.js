function MainController($scope, $rootScope, Global, $http) {
  $rootScope.$on('$routeChangeStart', function (event, next) {
    // if route requires auth and user is not logged in
    // if (!$scope.user && next.$$route && next.$$route.loginRequred) {
    //   Global.openLoginModal();
    //   $window.history.back();
    // }
  });

  $http.get('/users/me').success(function (result) {
    Global.user = result;
  });
}