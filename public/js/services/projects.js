'use strict';

//Projects service used for projects REST endpoint
window.app.factory('Projects', function ($resource) {
	return $resource('projects/:projectId', { projectId: '@_id' }, { update: {method: 'PUT'} });
});

window.app.factory('ProjectMembers', function ($resource) {
  return $resource('projects/:projectId/members/:memberId', {projectId: '@_id', memberId: '@_id' }, { update: { method: 'PUT' }});
});
