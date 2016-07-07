var taskStatusDict = [
  'Scheduled', // 0
  'In Progress (In Session)', // 1
  'In Progress (Not In Session)', // 2
  'Completed (Pending)', // 3
  'Completed', // 4
];

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
.controller('appCtrl', function($scope, Page, $window) {
  $scope.Page = Page;
  
  // sign out
  $scope.logout = function() {
    firebase.auth().signOut()
    .then(function(res) {
      console.log(res);
    }, function(error) {
      console.log(error);
    });
  };
  
  $scope.refresh = function() {
    $window.location.reload();
  }
})
.controller('mainCtrl', function($scope, Page, $window, $http) {
  Page.setTitle('Dispatch');
  
  // check if user is signed in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      firebase.database().ref('/users/'+user.uid).once('value').then(function(snapshot) {
        if (snapshot.exists()) {
          // user data found
          $window.location.href = '/'+snapshot.val().role+'/'+snapshot.val().userId;
        } else {
          // no user data found
          console.log('nope');
          firebase.auth().signOut();
          $window.location.href = '/';
        }
      });
    }
    $scope.pageLoaded = true;
    $scope.$apply();
  });
  
  $('#main-modal').on('show.bs.modal', function(e) {
    $scope.username = null;
    $scope.password = null;
    $scope.$apply();
  });
  
  $('#main-modal').on('shown.bs.modal', function(e) {
    $('#main-username').focus();
  });
  
  $scope.submit = function() {
    $scope.pageLoaded = false;
    firebase.auth().signInWithEmailAndPassword($scope.username+'@fake.email',$scope.password)
    .catch(function(error) {
      console.log('error');
      console.log(error);
      $scope.pageLoaded = true;
      $scope.$apply();
    })
    .then(function(res) {
      console.log('success');
      console.log(res)
      if (res) {
        firebase.database().ref('/users/'+res.uid).once('value')
        .then(function(snapshot) {
          console.log(snapshot.val());
          $window.location.href = '/'+snapshot.val().role+'/'+snapshot.val().userId;
        });
      }
    })
  };
})
.controller('managerCtrl', function($scope, $routeParams, Page, $window) {
  Page.setTitle('Manager');
})
.controller('technicianCtrl', function($scope, $routeParams, Page, $window) {
  Page.setTitle('Technician');
  $scope.taskStatusDict = taskStatusDict;
  $scope.time = Date.now();
  
  // check if user is signed in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      firebase.database().ref('/users/'+user.uid).once('value').then(function(snapshot) {
        if (snapshot.exists()) {
          // user data found
          $scope.user = snapshot.val();
          Page.setTitle('Technician | '+$scope.user.name);
          console.log($scope.user);
          $scope.pageLoaded = true;
          $scope.$apply();
          $scope.getTasks();
        } else {
          // no user data found
          console.log('nope');
          firebase.auth().signOut();
          $window.location.href = '/';
        }
      });
    } else {
      // No user is signed in.
      console.log('nope');
      $window.location.href = '/';
    }
  });
  
  // get tasks from database
  $scope.getTasks = function() {
    $scope.pageLoaded = false;
    // check filters
    if (true) {
      firebase.database().ref('/tasks').orderByChild('techId').equalTo($scope.user.userId).once('value').then(function(snapshot) {
        if (snapshot.exists()) {
          $scope.tasks = snapshot.val();
          $scope.tasksLoaded = true;
          console.log($scope.tasks);
        } else {
          $scope.tasksLoaded = true;
        }
        $scope.pageLoaded = true;
        $scope.$apply();
      });
    }
  };
  
  $scope.applyTaskFilter = function() {
    
  };
  
  // fills task details modal
  $scope.fillTaskDetails = function(id) {
    firebase.database().ref('/tasks').orderByChild('taskId').equalTo(id).once('value').then(function(snapshot) {
      console.log(snapshot.val()[id]);
      $scope.taskDetails = snapshot.val()[id];
      $scope.$apply();
    });
  };
  
  // start a new work session
  $scope.startSession = function() {
    var t = Date.now();
    var id = $scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/sessions').push({startTime:t,endTime:-1}, function() {
      firebase.database().ref('/tasks/'+id+'/status').set(1);
      $scope.fillTaskDetails($scope.taskDetails.taskId);
      $scope.getTasks();
    });
  };
  
  // end the current work session
  $scope.endSession = function() {
    var t = Date.now();
    var id = $scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/sessions').orderByChild('endTime').equalTo(-1).once('value').then(function(snapshot) {
      snapshot.forEach(function(child) {
        firebase.database().ref('/tasks/'+id+'/sessions/'+child.key+'/endTime').set(t, function() {
          firebase.database().ref('/tasks/'+id+'/status').set(2);
          $scope.fillTaskDetails($scope.taskDetails.taskId);
          $scope.getTasks();
        });
      });
    });
  };
  
  // report task as complete
  $scope.taskComplete = function() {
    var t = Date.now();
    var id=$scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/status').set(3, function() {
      $scope.fillTaskDetails($scope.taskDetails.taskId);
      $scope.getTasks();
    });
  };
  
  // reopen a pending task
  $scope.taskReopen = function() {
    var t = Date.now();
    var id=$scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/status').set(2, function() {
      $scope.fillTaskDetails($scope.taskDetails.taskId);
      $scope.getTasks();
    });
  };
  
  // add a note to the current task
  $scope.addNoteSubmit = function() {
    var t = Date.now();
    var id = $scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/notes').push({author:$scope.user.name+' (ID '+$scope.user.userId+')',time:t,content:$scope.addNoteContent}, function() {
      $scope.fillTaskDetails($scope.taskDetails.taskId);
    });
  }
});
