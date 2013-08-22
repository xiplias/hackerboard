//Projects service used for projects REST endpoint
window.app.factory("Projects", function($resource){
	return $resource('projects/:projectId', {projectId:'@_id'}, {update: {method: 'PUT'}});
});
