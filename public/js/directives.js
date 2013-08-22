app.directive('tagManager', function() {
    return {
        restrict: 'E',
        scope: { tags: '=' },
        template:
            '<input type="text" placeholder="Add a person..." ng-model="looking_for"></input> ' +
            '<a class="btn" ng-click="add()">Add</a>'+
            '<div class="tags">' +
                '<a ng-repeat="(idx, tag) in tags" class="looking_for" ng-click="remove(idx)">{{tag}}</a>' +
            '</div>',
        link: function ( $scope, $element ) {
            // FIXME: this is lazy and error-prone
            var input = angular.element( $element.children()[1] );
            
            // This adds the new tag to the tags array
            $scope.add = function() {
                $scope.tags.push( $scope.looking_for );
                $scope.looking_for = "";
            };
            
            // This is the ng-click handler to remove an item
            $scope.remove = function ( idx ) {
                $scope.tags.splice( idx, 1 );
            };
            
            // Capture all keypresses
            input.bind( 'keypress', function ( event ) {
                // But we only care when Enter was pressed
                if ( event.keyCode == 13 ) {
                    // There's probably a better way to handle this...
                    $scope.$apply( $scope.add );
                }
            });
        }
    };
}); 