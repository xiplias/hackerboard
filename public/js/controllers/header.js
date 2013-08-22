function HeaderController($scope, $location, Global) {
	$scope.global = Global;

	$scope.showCountdown = function () {
		$scope.countdownVisible = true;
		countdown(
	   	new Date(2013, 07, 24, 11),
	   	function(ts) {
	     	document.getElementById('pageTimer').innerHTML = ts.toHTML("strong");
	   	},
	   	countdown.DAYS|countdown.HOURS|countdown.MINUTES|countdown.SECONDS);
	};

	$scope.menu = [
		{
			"title": "Articles",
			"link": "articles"
		},
		{
			"title": "Create New Article",
			"link": "articles/create"
		}
	];

	$scope.init = function() {

	};
}