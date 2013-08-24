window.bootstrap = function () {
  angular.bootstrap(document, ['MEAN']);
};

window.init = function () {
  window.bootstrap();
};

$(document).ready(function () {
  window.init();
});