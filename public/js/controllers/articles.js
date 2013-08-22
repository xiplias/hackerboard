function ArticlesController($scope, $routeParams, $location, Global, Articles) {
  $scope.global = Global;

  $scope.tags = [];

  $scope.create = function () {
    var article = new Articles({ 
      title: this.title, 
      content: this.content, 
      short: this.short,
      github: this.github
    });

    article.$save(function (response) {
      $scope.projects = $scope.find();
      $location.path("projects/" + response._id);
    });
  };

  $scope.isSelected = function (project) {
    return project._id === $routeParams.articleId;
  };

  $scope.remove = function (article) {
    article.$remove();

    for (var i in $scope.articles) {
      if ($scope.articles[i] == article) {
        $scope.articles.splice(i, 1);
      }
    }
  };

  $scope.update = function () {
    var article = $scope.project;
    article.looking_for = $scope.tags;
    if (!article.updated) {
      article.updated = [];
    }
    article.updated.push(new Date().getTime());

    article.$update(function () {
      $scope.projects = $scope.find();
      $location.path("projects/" + article._id);
    });
  };

  $scope.find = function (query) {
    Articles.query(query, function (projects) {
      $scope.projects = projects;
    });
  };

  $scope.findOne = function () {
    Articles.get({ articleId: $routeParams.articleId }, function (project) {
      $scope.project = project;
    });
  };
}