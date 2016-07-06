// Initialize Firebase
var config = {
  apiKey: "AIzaSyBUpCFJyX81TjLNyKXoSWdetQYEIZs3lNc",
  authDomain: "dispatch-d4ccf.firebaseapp.com",
  databaseURL: "https://dispatch-d4ccf.firebaseio.com",
  storageBucket: "dispatch-d4ccf.appspot.com",
};
firebase.initializeApp(config);
  
// app code
angular.module('dispatchApp', ['ngRoute'])
.config(function($routeProvider, $locationProvider) {
  $routeProvider
  .when('/', {
    templateUrl: 'partials/main.htm',
    controller: 'mainCtrl',
  })
  .when('/manager/:managerId', {
    templateUrl: 'partials/manager.htm',
    controller: 'managerCtrl',
  })
  .when('/technician/:techId', {
    templateUrl: 'partials/technician.htm',
    controller: 'technicianCtrl',
  })
  .otherwise({
    redirectTo: '/',
  });
  
  $locationProvider.html5Mode(true);
})
// Page service for get/set page title
.factory('Page', function() {
  var service = {};
  var title = 'default title';
  
  service.setTitle = function(newTitle) {
    title = newTitle;
  };
  
  service.getTitle = function() {
    return title;
  };
  
  return service;
})
.controller('appCtrl', function($scope, Page) {
  $scope.Page = Page;
  $scope.user;
})
.controller('mainCtrl', function($scope, Page, $window, $http) {
  Page.setTitle('Main');
  $scope.user;
  
  $('#main-modal').on('show.bs.modal', function(e) {
    $scope.username = null;
    $scope.password = null;
    $scope.$apply();
  });
  
  $('#main-modal').on('shown.bs.modal', function(e) {
    $('#main-username').focus();
  });
  
  $scope.submit = function() {
    firebase.auth().signInWithEmailAndPassword($scope.username+'@fake.email',$scope.password)
    .catch(function(error) {
      console.log('error');
      console.log(error);
    })
    .then(function(res) {
      console.log('success');
      console.log(res)
      if (res) {
        firebase.database().ref('/users/'+res.uid).once('value')
        .then(function(snapshot) {
          console.log(snapshot.val());
          $window.location.href = '/'+snapshot.val().role+'/'+snapshot.val().username;
        });
      }
    })
  };
})
.controller('managerCtrl', function($scope, $routeParams, Page, $window) {
  Page.setTitle('Manager');
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      firebase.database().ref('/users/'+user.uid).once('value').then(function(snapshot) {
        $scope.user = snapshot.val();
        $scope.getJobs();
      });
    } else {
      // No user is signed in.
      console.log('nope');
      $window.location.href = '/';
    }
  });
      
  $scope.logout = function() {
    if (window.confirm('Log out?')) {
      firebase.auth().signOut()
      .then(function(res) {
        console.log(res);
      }, function(error) {
        console.log(error);
      })
    }
  };
  
  $scope.getJobs = function() {
    if ($scope.jobSearchFilter) {
      // filtered results
    } else {
      // unfiltered results
      firebase.database().ref('/jobs/').once('value').then(function(snapshot) {
        $scope.jobs = snapshot.val();
        for (var job in $scope.jobs) {
          let j = job;
          if ($scope.jobs[j].technicianId) {
            firebase.database().ref('/users/'+$scope.jobs[j].technicianId).once('value').then(function(snapshot) {
              $scope.jobs[j].technicianId = snapshot.val().userId;
              $scope.$apply();
            });
          } else {
            $scope.jobs[j].technicianId = 'Unassigned'
          }
        }
        $scope.$apply();
      });
    }
  };
  
  $scope.jobDetailsFill = function(id) {
    console.log(id);
    firebase.database().ref('/jobs/'+id).once('value').then(function(snapshot) {
      $scope.jobDetailsJob = snapshot.val();
      if ($scope.jobDetailsJob.technicianId) {
        firebase.database().ref('/users/'+$scope.jobDetailsJob.technicianId).once('value').then(function(snapshot) {
          $scope.jobDetailsJob.technicianId = snapshot.val().userId;
          $scope.$apply();
        });
      } else {
        $scope.jobDetailsJob.technicianId = 'Unassigned';
        $scope.$apply();
      }
    });
  };
})
.controller('technicianCtrl', function($scope, $routeParams, Page) {
  Page.setTitle('Technician');
});
