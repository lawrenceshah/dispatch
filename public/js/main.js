// array of task statuses
var taskStatusDict = [
  'Scheduled (Unassigned)', // 0
  'Scheduled (Assigned)', // 1
  'In Progress (In Session)', // 2
  'In Progress (Not In Session)', // 3
  'Completed (Pending)', // 4
  'Completed (Approved)', // 5
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
  .when('/manager/:userId', {
    templateUrl: 'partials/manager.htm',
    controller: 'managerCtrl',
  })
  .when('/technician/:userId', {
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
    } else {
      $scope.pageLoaded = true;
    }
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
    })
    .then(function(res) {
      if (res) {
        firebase.database().ref('/users/'+res.uid).once('value')
        .then(function(snapshot) {
          $window.location.href = '/'+snapshot.val().role+'/'+snapshot.val().userId;
        });
      }
    })
  };
})
.controller('managerCtrl', function($scope, $routeParams, Page, $window) {
  Page.setTitle('Manager');
  $scope.taskStatusDict = taskStatusDict;
  $scope.time = Date.now();
  
  // check if user is signed in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      firebase.database().ref('/users/'+user.uid).once('value').then(function(snapshot) {
        if (snapshot.exists() && snapshot.val().role === 'manager' && snapshot.val().userId === parseInt($routeParams.userId)) {
          // user data found
          $scope.user = snapshot.val();
          Page.setTitle('Manager | '+$scope.user.name);
          $scope.pageLoaded = true;
          $scope.getTasks();
          $scope.getAllTechnicians();
          $scope.getTechnicians();
          $scope.$apply();
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
    firebase.database().ref('/tasks').once('value').then(function(snapshot) {
      if (snapshot.exists()) {
        $scope.tasks = snapshot.val();
        // check filters
        if ($scope.taskFilter) {
          if ($scope.taskFilter.taskId) {
            var key = parseInt($scope.taskFilter.taskId);
            var task = $scope.tasks[$scope.taskFilter.taskId];
            $scope.tasks = {};
            if (task !== undefined) {
              $scope.tasks[key] = task;
            }
          }
          if ($scope.taskFilter.status !== undefined) {
            for (var key in $scope.tasks) {
              if ($scope.tasks[key].status !== $scope.taskFilter.status) {
                delete $scope.tasks[key];
              }
            }
          }
          if ($scope.taskFilter.scheduledDate !== null) {
            var date = $scope.taskFilter.scheduledDate.valueOf();
            for (var key in $scope.tasks) {
              if ($scope.tasks[key].scheduledDate < date || $scope.tasks[key].scheduledDate > date+1000*60*60*24) {
                delete $scope.tasks[key];
              }
            }
          }
        }
        // convert tasks to array for sorting purposes
        $scope.tasksArr = [];
        for (var key in $scope.tasks) {
          $scope.tasksArr.push($scope.tasks[key]);
        }
        $scope.tasks = $scope.tasksArr;
        $scope.tasksLoaded = true;
      } else {
        $scope.tasksLoaded = true;
      }
      $scope.pageLoaded = true;
      $scope.$apply();
    });
  };
  
  // get all technicians data, for assigning tasks
  $scope.getAllTechnicians = function() {
    firebase.database().ref('/users').orderByChild('role').equalTo('technician').once('value').then(function(snapshot) {
      $scope.allTechnicians = snapshot.val();
    });
  };
  
  // return technician by id, for getting name
  $scope.getTechById = function(id) {
    for (var key in $scope.allTechnicians) {
      if ($scope.allTechnicians[key].userId === id) {
        return $scope.allTechnicians[key];
      }
    }
    return false;
  };
  
  $('#new-task-description-mirror')
  .css({
    'padding':$('#new-task-description').css('padding'),
    'outline':$('#new-task-description').css('outline'),
    'margin':$('#new-task-description').css('margin'),
    'border':$('#new-task-description').css('border'),
  }).width($('#new-task-description').width());
  $('#new-task-description').on('input', function() {
    window.setTimeout(function() {
      $('#new-task-description-mirror').width($('#new-task-description').width());
      $('#new-task-description').height($('#new-task-description-mirror').height());
    }, 200);
  });
  
  // create new task
  $scope.createNewTask = function() {
    firebase.database().ref('/tasks').orderByChild('taskId').limitToLast(1).once('value').then(function(snapshot) {
      console.log(snapshot.val());
      $scope.newTask.status = 0;
      console.log($scope.newTask.scheduledDate);
      console.log($scope.newTask.scheduledDate.valueOf());
      $scope.newTask.scheduledDate = $scope.newTask.scheduledDate.valueOf();
      snapshot.forEach(function(child) {
        console.log(child.val());
        $scope.newTask.taskId = child.val().taskId+1;
      });
      console.log($scope.newTask);
      firebase.database().ref('/tasks').push($scope.newTask, function() {
        console.log('new task created');
        $scope.newTask = {};
        $scope.getTasks();
      });
    })
  };
  
  // cancel and clear new task inputs
  $scope.createNewTaskCancel = function() {
    $scope.newTask = {};
    $('#create-new-task-collapse').collapse('hide');
  };
  
  // open task filter
  $scope.taskFilterButtonOpen = function(id) {
    $('.task-filter-button[data-id="'+id+'"]').addClass('active').find('input').focus();
  };
  
  // close task filter
  $scope.taskFilterButtonClose = function(id, e) {
    e.stopPropagation();
    $('.task-filter-button[data-id="'+id+'"]').removeClass('active');
    if ($scope.taskFilter) {
      delete $scope.taskFilter[id];
      if ($scope.taskFilter === {}) {
        $scope.taskFilter = null;
      }
    }
  };
  
  // clear task filters
  $scope.taskFilterClear = function() {
    $scope.taskFilter = null;
    $('.task-filter-button').removeClass('active');
  };
  
  // fills task details modal
  $scope.fillTaskDetails = function(id) {
    firebase.database().ref('/tasks').orderByChild('taskId').equalTo(id).once('value').then(function(snapshot) {
      snapshot.forEach(function(child) {
        $scope.taskDetails = child.val();
        $scope.$apply();
      })
    });
  };
  
  // assign task to technician
  $scope.assignTask = function() {
    firebase.database().ref('/tasks/'+$scope.taskDetails.taskId+'/techId').set($scope.taskDetails.techId, function() {
      console.log('task assigned');
      if ($scope.taskDetails.techId === null) {
        firebase.database().ref('/tasks/'+$scope.taskDetails.taskId+'/status').set(0, function() {
          $scope.fillTaskDetails($scope.taskDetails.taskId);
        });
      } else {
        firebase.database().ref('/tasks/'+$scope.taskDetails.taskId+'/status').set(1, function() {
          $scope.fillTaskDetails($scope.taskDetails.taskId);
        });
      }
    });
  };
  
  // approve task as complete
  $scope.approveTaskComplete = function() {
    firebase.database().ref('/tasks/'+$scope.taskDetails.taskId+'/status').set(5, function() {
      $scope.fillTaskDetails($scope.taskDetails.taskId);
    });
  };
  
  // reopen a pending task
  $scope.taskReopen = function() {
    var t = Date.now();
    var id=$scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/status').set(3, function() {
      $scope.fillTaskDetails($scope.taskDetails.taskId);
      $scope.getTasks();
    });
  };
  
  $scope.deleteTask = function() {
    firebase.database().ref('/tasks').orderByChild('taskId').equalTo($scope.taskDetails.taskId).once('value').then(function(snapshot) {
      snapshot.forEach(function(child) {
        firebase.database().ref('/tasks/'+child.key).remove(function() {
          console.log('task deleted');
          $('#task-details-modal').modal('hide');
          $scope.getTasks();
        });
      });
    });
  };
  
  $('#new-note-mirror')
  .css({
    'padding':$('#new-note').css('padding'),
    'outline':$('#new-note').css('outline'),
    'margin':$('#new-note').css('margin'),
    'border':$('#new-note').css('border'),
  }).width($('#new-note').width());
  $('#new-note').on('input', function() {
    window.setTimeout(function() {
      $('#new-note-mirror').width($('#new-note').width());
      $('#new-note').height($('#new-note-mirror').height());
    }, 200);
  });
  
  // add a note to the current task
  $scope.addNoteSubmit = function() {
    var t = Date.now();
    var id = $scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/notes').push({author:$scope.user.name+' (ID '+$scope.user.userId+')',time:t,content:$scope.addNoteContent}, function() {
      $scope.fillTaskDetails($scope.taskDetails.taskId);
    });
  }
  
  // get technicians, possibly filtered
  $scope.getTechnicians = function() {
    $scope.pageLoaded = false;
    firebase.database().ref('/users').orderByChild('role').equalTo('technician').once('value').then(function(snapshot) {
      if (snapshot.exists()) {
        $scope.techniciansTemp = snapshot.val();
        $scope.technicians = null;
        // check filters
        if ($scope.technicianFilter) {
          if ($scope.technicianFilter.technicianId) {
            var userId = parseInt($scope.technicianFilter.technicianId);
            for (var key in $scope.techniciansTemp) {
              if ($scope.techniciansTemp[key].userId === userId) {
                $scope.technicians = {key:$scope.techniciansTemp[key]};
                break;
              }
            }
          }
        } else {
          $scope.technicians = $scope.techniciansTemp;
        }
        // convert tasks to array for sorting purposes
        $scope.techniciansArr = [];
        for (var key in $scope.technicians) {
          $scope.techniciansArr.push($scope.technicians[key]);
        }
        $scope.technicians = $scope.techniciansArr;
        $scope.techniciansLoaded = true;
      } else {
        $scope.techniciansLoaded = true;
      }
      $scope.pageLoaded = true;
      $scope.$apply();
    });
  };
  
  // open technician filter
  $scope.technicianFilterButtonOpen = function(id) {
    $('.technician-filter-button[data-id="'+id+'"]').addClass('active').find('input').focus();
  };
  
  // close technician filter
  $scope.technicianFilterButtonClose = function(id, e) {
    e.stopPropagation();
    $('.technician-filter-button[data-id="'+id+'"]').removeClass('active');
    if ($scope.technicianFilter) {
      delete $scope.technicianFilter[id];
      if ($scope.technicianFilter === {}) {
        $scope.technicianFilter = null;
      }
    }
  };
  
  // clear technician filters
  $scope.technicianFilterClear = function() {
    $scope.technicianFilter = null;
    $('.technician-filter-button').removeClass('active');
  };
  
  // fills technician details modal
  $scope.fillTechnicianDetails = function(id) {
    firebase.database().ref('/users').orderByChild('userId').equalTo(id).once('value').then(function(snapshot) {
      snapshot.forEach(function(child) {
        $scope.technicianDetails = child.val();
        firebase.database().ref('/tasks').orderByChild('techId').equalTo(id).once('value').then(function(snapshot2) {
          $scope.technicianDetails.assignedTasks = snapshot2.val();
          for (var key in $scope.technicianDetails.assignedTasks) {
            if ($scope.technicianDetails.assignedTasks[key].status === 5) {
              delete $scope.technicianDetails.assignedTasks[key];
            }
          }
          $scope.$apply();
          console.log($scope.technicianDetails);
        });
        $scope.$apply();
      })
    });
  };
})
.controller('technicianCtrl', function($scope, $routeParams, Page, $window) {
  Page.setTitle('Technician');
  $scope.taskStatusDict = taskStatusDict;
  $scope.time = Date.now();
  $scope.true = true;
  
  // check if user is signed in
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      firebase.database().ref('/users/'+user.uid).once('value').then(function(snapshot) {
        if (snapshot.exists() && snapshot.val().role === 'technician' && snapshot.val().userId === parseInt($routeParams.userId)) {
          // user data found
          $scope.user = snapshot.val();
          Page.setTitle('Technician | '+$scope.user.name);
          $scope.pageLoaded = true;
          $scope.getTasks();
          $scope.getAllTechnicians();
          $scope.$apply();
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
    firebase.database().ref('/tasks').orderByChild('techId').equalTo($scope.user.userId).once('value').then(function(snapshot) {
      if (snapshot.exists()) {
        $scope.tasks = snapshot.val();
        // check filters
        if ($scope.taskFilter) {
          if ($scope.taskFilter.taskId) {
            var key = parseInt($scope.taskFilter.taskId);
            var task = $scope.tasks[$scope.taskFilter.taskId];
            $scope.tasks = {};
            if (task !== undefined) {
              $scope.tasks[key] = task;
            }
          }
          if ($scope.taskFilter.status !== undefined) {
            for (var key in $scope.tasks) {
              if ($scope.tasks[key].status !== $scope.taskFilter.status) {
                delete $scope.tasks[key];
              }
            }
          }
          if ($scope.taskFilter.scheduledDate !== null) {
            var date = $scope.taskFilter.scheduledDate.valueOf();
            for (var key in $scope.tasks) {
              if ($scope.tasks[key].scheduledDate < date || $scope.tasks[key].scheduledDate > date+1000*60*60*24) {
                delete $scope.tasks[key];
              }
            }
          }
        }
        // convert tasks to array for sorting purposes
        $scope.tasksArr = [];
        for (var key in $scope.tasks) {
          $scope.tasksArr.push($scope.tasks[key]);
        }
        $scope.tasks = $scope.tasksArr;
        $scope.tasksLoaded = true;
      } else {
        $scope.tasksLoaded = true;
      }
      $scope.pageLoaded = true;
      $scope.$apply();
    });
  };
  
  // get all technicians data, for assigning tasks
  $scope.getAllTechnicians = function() {
    firebase.database().ref('/users').orderByChild('role').equalTo('technician').once('value').then(function(snapshot) {
      $scope.allTechnicians = snapshot.val();
    });
  };
  
  // return technician by id, for getting name
  $scope.getTechById = function(id) {
    for (var key in $scope.allTechnicians) {
      if ($scope.allTechnicians[key].userId === id) {
        return $scope.allTechnicians[key];
      }
    }
    return false;
  };
  
  // open task filter
  $scope.taskFilterButtonOpen = function(id) {
    $('.task-filter-button[data-id="'+id+'"]').addClass('active').find('input').focus();
  };
  
  // close task filter
  $scope.taskFilterButtonClose = function(id, e) {
    e.stopPropagation();
    $('.task-filter-button[data-id="'+id+'"]').removeClass('active');
    if ($scope.taskFilter) {
      delete $scope.taskFilter[id];
      if ($scope.taskFilter === {}) {
        $scope.taskFilter = null;
      }
    }
  };
  
  // clear task filters
  $scope.taskFilterClear = function() {
    $scope.taskFilter = null;
    $('.task-filter-button').removeClass('active');
  };
  
  // fills task details modal
  $scope.fillTaskDetails = function(id) {
    firebase.database().ref('/tasks').orderByChild('taskId').equalTo(id).once('value').then(function(snapshot) {
      $scope.taskDetails = snapshot.val()[id];
      $scope.$apply();
    });
  };
  
  // start a new work session
  $scope.startSession = function() {
    var t = Date.now();
    var id = $scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/sessions').push({startTime:t,endTime:-1}, function() {
      firebase.database().ref('/tasks/'+id+'/status').set(2);
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
          firebase.database().ref('/tasks/'+id+'/status').set(3);
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
    firebase.database().ref('/tasks/'+id+'/status').set(4, function() {
      $scope.fillTaskDetails($scope.taskDetails.taskId);
      $scope.getTasks();
    });
  };
  
  // reopen a pending task
  $scope.taskReopen = function() {
    var t = Date.now();
    var id=$scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/status').set(3, function() {
      $scope.fillTaskDetails($scope.taskDetails.taskId);
      $scope.getTasks();
    });
  };
  
  $('#new-note-mirror')
  .css({
    'padding':$('#new-note').css('padding'),
    'outline':$('#new-note').css('outline'),
    'margin':$('#new-note').css('margin'),
    'border':$('#new-note').css('border'),
  }).width($('#new-note').width());
  $('#new-note').on('input', function() {
    window.setTimeout(function() {
      $('#new-note-mirror').width($('#new-note').width());
      $('#new-note').height($('#new-note-mirror').height());
    }, 200);
  });
  
  // add a note to the current task
  $scope.addNoteSubmit = function() {
    var t = Date.now();
    var id = $scope.taskDetails.taskId;
    firebase.database().ref('/tasks/'+id+'/notes').push({author:$scope.user.name+' (ID '+$scope.user.userId+')',time:t,content:$scope.addNoteContent}, function() {
      $scope.fillTaskDetails($scope.taskDetails.taskId);
    });
  }
});
