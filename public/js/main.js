// array of task statuses
var taskStatusDict = {
  0: 'Scheduled (Unassigned)',
  1: 'Scheduled (Assigned)',
  2: 'In Progress (In Session)',
  3: 'In Progress (Not In Session)',
  4: 'Completed (Pending)',
  5: 'Completed (Approved)',
};

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
// filter for showing x hours, y minutes
.filter('hoursMinutes', function() {
  return function(time) {
    if (time !== null) {
      var timeInMinutes = Math.floor(time/1000/60);
      var hours = Math.floor(timeInMinutes/60);
      var minutes = timeInMinutes%60;
      
      return hours+' Hours '+minutes+' minutes';
    }
    return null;
  }
})
.controller('appCtrl', function($scope, Page, $window) {
  $scope.Page = Page;
  
  // sign out
  $scope.logout = function() {
    firebase.auth().signOut()
    .then(function(res) {
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
          console.log('no user data found');
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
      console.log(error);
      $scope.loginError = true;
      $scope.pageLoaded = true;
      $scope.$apply();
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
          alert('getting tasks');
          $scope.getTasks();
          alert('getting all technicians');
          $scope.getAllTechnicians();
          alert('getting technicians');
          $scope.getTechnicians();
          alert('getting total statistics');
          $scope.getTotalStatistics();
          alert('done');
          $scope.$apply();
        } else {
          // no user data found
          console.log('no user data found');
          firebase.auth().signOut();
          $window.location.href = '/';
        }
      });
    } else {
      // No user is signed in.
      console.log('not signed in');
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
            for (var key in $scope.tasks) {
              if ($scope.tasks[key].taskId !== parseInt($scope.taskFilter.taskId)) {
                delete $scope.tasks[key];
              }
            }
          }
          if ($scope.taskFilter.techId) {
            for (var key in $scope.tasks) {
              if ($scope.tasks[key].techId !== parseInt($scope.taskFilter.techId)) {
                delete $scope.tasks[key];
              }
            }
          }
          if ($scope.taskFilter.status !== undefined) {
            for (var key in $scope.tasks) {
              if ($scope.tasks[key].status !== parseInt($scope.taskFilter.status)) {
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
      $scope.newTask.status = 0;
      $scope.newTask.scheduledDate = $scope.newTask.scheduledDate.valueOf();
      snapshot.forEach(function(child) {
        $scope.newTask.taskId = child.val().taskId+1;
      });
      firebase.database().ref('/tasks/'+$scope.newTask.taskId).set($scope.newTask, function() {
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
          $scope.getTechnicianStatistics(id);
        });
      })
    });
  };
  
  // statistics
  $scope.getTechnicianStatistics = function(id) {
    var cutoffWeek = new Date();
    cutoffWeek.setDate(cutoffWeek.getDate() - (cutoffWeek.getDay()-1)%7);
    cutoffWeek.setHours(0,0,0,0);
    var statisticsWeekLabel = cutoffWeek.toDateString().slice(0,10);
    cutoffWeek = cutoffWeek.valueOf();
    
    var cutoffTwoWeeks = new Date();
    cutoffTwoWeeks.setDate(cutoffTwoWeeks.getDate() - (cutoffTwoWeeks.getDay()-1)%7 - 7);
    cutoffTwoWeeks.setHours(0,0,0,0);
    var statisticsTwoWeeksLabel = cutoffTwoWeeks.toDateString().slice(0,10);
    cutoffTwoWeeks = cutoffTwoWeeks.valueOf();
    
    var cutoffMonth = new Date();
    cutoffMonth.setDate(1);
    cutoffMonth.setHours(0,0,0,0);
    var statisticsMonthLabel = cutoffMonth.toDateString().slice(0,10);
    cutoffMonth = cutoffMonth.valueOf();
    
    firebase.database().ref('/tasks').orderByChild('techId').equalTo(id).once('value').then(function(snapshot) {
      var hoursWorkedWeek = 0;
      var sessionsWorkedWeek = 0;
      var tasksWorkedWeek = 0;
      var tasksWorkedWeekObj = {};
      
      var hoursWorkedTwoWeeks = 0;
      var sessionsWorkedTwoWeeks = 0;
      var tasksWorkedTwoWeeks = 0;
      var tasksWorkedTwoWeeksObj = {};
      
      var hoursWorkedMonth = 0;
      var sessionsWorkedMonth = 0;
      var tasksWorkedMonth = 0;
      var tasksWorkedMonthObj = {};
      
      snapshot.forEach(function(child) {
        var sessions = child.val().sessions;
        for (key in sessions) {
          if (sessions[key].endTime > cutoffWeek) {
            hoursWorkedWeek += sessions[key].endTime - Math.max(sessions[key].startTime,cutoffWeek);
            sessionsWorkedWeek++;
            tasksWorkedWeekObj[child.key] = true;
          }
          if (sessions[key].endTime > cutoffTwoWeeks) {
            hoursWorkedTwoWeeks += sessions[key].endTime - Math.max(sessions[key].startTime,cutoffTwoWeeks);
            sessionsWorkedTwoWeeks++;
            tasksWorkedTwoWeeksObj[child.key] = true;
          }
          if (sessions[key].endTime > cutoffMonth) {
            hoursWorkedMonth += sessions[key].endTime - Math.max(sessions[key].startTime,cutoffMonth);
            sessionsWorkedMonth++;
            tasksWorkedMonthObj[child.key] = true;
          }
        }
      });
      for (var key in tasksWorkedWeekObj) {
        tasksWorkedWeek++;
      }
      for (var key in tasksWorkedTwoWeeksObj) {
        tasksWorkedTwoWeeks++;
      }
      for (var key in tasksWorkedMonthObj) {
        tasksWorkedMonth++;
      }
      $scope.technicianDetails.statisticsWeekLabel = statisticsWeekLabel;
      $scope.technicianDetails.hoursWorkedWeek = hoursWorkedWeek;
      $scope.technicianDetails.sessionsWorkedWeek = sessionsWorkedWeek;
      $scope.technicianDetails.tasksWorkedWeek = tasksWorkedWeek;
      
      $scope.technicianDetails.statisticsTwoWeeksLabel = statisticsTwoWeeksLabel;
      $scope.technicianDetails.hoursWorkedTwoWeeks = hoursWorkedTwoWeeks;
      $scope.technicianDetails.sessionsWorkedTwoWeeks = sessionsWorkedTwoWeeks;
      $scope.technicianDetails.tasksWorkedTwoWeeks = tasksWorkedTwoWeeks;
      
      $scope.technicianDetails.statisticsMonthLabel = statisticsMonthLabel;
      $scope.technicianDetails.hoursWorkedMonth = hoursWorkedMonth;
      $scope.technicianDetails.sessionsWorkedMonth = sessionsWorkedMonth;
      $scope.technicianDetails.tasksWorkedMonth = tasksWorkedMonth;
      $scope.$apply();
    });
  };
  
  $scope.getTotalStatistics = function() {
    var cutoffWeek = new Date();
    cutoffWeek.setDate(cutoffWeek.getDate() - (cutoffWeek.getDay()-1)%7);
    cutoffWeek.setHours(0,0,0,0);
    var totalStatisticsWeekLabel = cutoffWeek.toDateString().slice(0,10);
    cutoffWeek = cutoffWeek.valueOf();
    
    var cutoffTwoWeeks = new Date();
    cutoffTwoWeeks.setDate(cutoffTwoWeeks.getDate() - (cutoffTwoWeeks.getDay()-1)%7 - 7);
    cutoffTwoWeeks.setHours(0,0,0,0);
    var totalStatisticsTwoWeeksLabel = cutoffTwoWeeks.toDateString().slice(0,10);
    cutoffTwoWeeks = cutoffTwoWeeks.valueOf();
    
    var cutoffMonth = new Date();
    cutoffMonth.setDate(1);
    cutoffMonth.setHours(0,0,0,0);
    var totalStatisticsMonthLabel = cutoffMonth.toDateString().slice(0,10);
    cutoffMonth = cutoffMonth.valueOf();
    
    firebase.database().ref('/tasks').once('value').then(function(snapshot) {
      var totalHoursWorkedWeek = 0;
      var totalSessionsWorkedWeek = 0;
      var totalTasksWorkedWeek = 0;
      var totalTasksWorkedWeekObj = {};
      
      var totalHoursWorkedTwoWeeks = 0;
      var totalSessionsWorkedTwoWeeks = 0;
      var totalTasksWorkedTwoWeeks = 0;
      var totalTasksWorkedTwoWeeksObj = {};
      
      var totalHoursWorkedMonth = 0;
      var totalSessionsWorkedMonth = 0;
      var totalTasksWorkedMonth = 0;
      var totalTasksWorkedMonthObj = {};
      
      snapshot.forEach(function(child) {
        var sessions = child.val().sessions;
        for (key in sessions) {
          if (sessions[key].endTime > cutoffWeek) {
            totalHoursWorkedWeek += sessions[key].endTime - Math.max(sessions[key].startTime,cutoffWeek);
            totalSessionsWorkedWeek++;
            totalTasksWorkedWeekObj[child.key] = true;
          }
          if (sessions[key].endTime > cutoffTwoWeeks) {
            totalHoursWorkedTwoWeeks += sessions[key].endTime - Math.max(sessions[key].startTime,cutoffTwoWeeks);
            totalSessionsWorkedTwoWeeks++;
            totalTasksWorkedTwoWeeksObj[child.key] = true;
          }
          if (sessions[key].endTime > cutoffMonth) {
            totalHoursWorkedMonth += sessions[key].endTime - Math.max(sessions[key].startTime,cutoffMonth);
            totalSessionsWorkedMonth++;
            totalTasksWorkedMonthObj[child.key] = true;
          }
        }
      });
      for (var key in totalTasksWorkedWeekObj) {
        totalTasksWorkedWeek++;
      }
      for (var key in totalTasksWorkedTwoWeeksObj) {
        totalTasksWorkedTwoWeeks++;
      }
      for (var key in totalTasksWorkedMonthObj) {
        totalTasksWorkedMonth++;
      }
      $scope.totalStatisticsWeekLabel = totalStatisticsWeekLabel;
      $scope.totalHoursWorkedWeek = totalHoursWorkedWeek;
      $scope.totalSessionsWorkedWeek = totalSessionsWorkedWeek;
      $scope.totalTasksWorkedWeek = totalTasksWorkedWeek;
      
      $scope.totalStatisticsTwoWeeksLabel = totalStatisticsTwoWeeksLabel;
      $scope.totalHoursWorkedTwoWeeks = totalHoursWorkedTwoWeeks;
      $scope.totalSessionsWorkedTwoWeeks = totalSessionsWorkedTwoWeeks;
      $scope.totalTasksWorkedTwoWeeks = totalTasksWorkedTwoWeeks;
      
      $scope.totalStatisticsMonthLabel = totalStatisticsMonthLabel;
      $scope.totalHoursWorkedMonth = totalHoursWorkedMonth;
      $scope.totalSessionsWorkedMonth = totalSessionsWorkedMonth;
      $scope.totalTasksWorkedMonth = totalTasksWorkedMonth;
      $scope.$apply();
    });
  };
})
.controller('technicianCtrl', function($scope, $routeParams, Page, $window) {
  Page.setTitle('Technician');
  $scope.taskStatusDict = taskStatusDict;
  delete $scope.taskStatusDict[0];
  $scope.time = Date.now();
  $scope.statisticsTimespans = ['week','month'];
  $scope.statisticsTimespan = 'week';
  
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
          $scope.getStatistics();
          $scope.$apply();
        } else {
          // no user data found
          console.log('no user data found');
          firebase.auth().signOut();
          $window.location.href = '/';
        }
      });
    } else {
      // No user is signed in.
      console.log('not signed in');
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
            for (var key in $scope.tasks) {
              if ($scope.tasks[key].taskId !== parseInt($scope.taskFilter.taskId)) {
                delete $scope.tasks[key];
              }
            }
          }
          if ($scope.taskFilter.status !== undefined) {
            for (var key in $scope.tasks) {
              if ($scope.tasks[key].status !== parseInt($scope.taskFilter.status)) {
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
  
  // get all technicians data, mainly name, for assigning tasks or displaying notes/sessions
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
  };
  
  // statistics
  $scope.getStatistics = function() {
    var cutoffWeek = new Date();
    cutoffWeek.setDate(cutoffWeek.getDate() - (cutoffWeek.getDay()-1)%7);
    cutoffWeek.setHours(0,0,0,0);
    var statisticsWeekLabel = cutoffWeek.toDateString().slice(0,10);
    cutoffWeek = cutoffWeek.valueOf();
    
    var cutoffTwoWeeks = new Date();
    cutoffTwoWeeks.setDate(cutoffTwoWeeks.getDate() - (cutoffTwoWeeks.getDay()-1)%7 - 7);
    cutoffTwoWeeks.setHours(0,0,0,0);
    var statisticsTwoWeeksLabel = cutoffTwoWeeks.toDateString().slice(0,10);
    cutoffTwoWeeks = cutoffTwoWeeks.valueOf();
    
    var cutoffMonth = new Date();
    cutoffMonth.setDate(1);
    cutoffMonth.setHours(0,0,0,0);
    var statisticsMonthLabel = cutoffMonth.toDateString().slice(0,10);
    cutoffMonth = cutoffMonth.valueOf();
    
    firebase.database().ref('/tasks').orderByChild('techId').equalTo($scope.user.userId).once('value').then(function(snapshot) {
      var hoursWorkedWeek = 0;
      var sessionsWorkedWeek = 0;
      var tasksWorkedWeek = 0;
      var tasksWorkedWeekObj = {};
      
      var hoursWorkedTwoWeeks = 0;
      var sessionsWorkedTwoWeeks = 0;
      var tasksWorkedTwoWeeks = 0;
      var tasksWorkedTwoWeeksObj = {};
      
      var hoursWorkedMonth = 0;
      var sessionsWorkedMonth = 0;
      var tasksWorkedMonth = 0;
      var tasksWorkedMonthObj = {};
      
      snapshot.forEach(function(child) {
        var sessions = child.val().sessions;
        for (key in sessions) {
          if (sessions[key].endTime > cutoffWeek) {
            hoursWorkedWeek += sessions[key].endTime - Math.max(sessions[key].startTime,cutoffWeek);
            sessionsWorkedWeek++;
            tasksWorkedWeekObj[child.key] = true;
          }
          if (sessions[key].endTime > cutoffTwoWeeks) {
            hoursWorkedTwoWeeks += sessions[key].endTime - Math.max(sessions[key].startTime,cutoffTwoWeeks);
            sessionsWorkedTwoWeeks++;
            tasksWorkedTwoWeeksObj[child.key] = true;
          }
          if (sessions[key].endTime > cutoffMonth) {
            hoursWorkedMonth += sessions[key].endTime - Math.max(sessions[key].startTime,cutoffMonth);
            sessionsWorkedMonth++;
            tasksWorkedMonthObj[child.key] = true;
          }
        }
      });
      for (var key in tasksWorkedWeekObj) {
        tasksWorkedWeek++;
      }
      for (var key in tasksWorkedTwoWeeksObj) {
        tasksWorkedTwoWeeks++;
      }
      for (var key in tasksWorkedMonthObj) {
        tasksWorkedMonth++;
      }
      $scope.statisticsWeekLabel = statisticsWeekLabel;
      $scope.hoursWorkedWeek = hoursWorkedWeek;
      $scope.sessionsWorkedWeek = sessionsWorkedWeek;
      $scope.tasksWorkedWeek = tasksWorkedWeek;
      
      $scope.statisticsTwoWeeksLabel = statisticsTwoWeeksLabel;
      $scope.hoursWorkedTwoWeeks = hoursWorkedTwoWeeks;
      $scope.sessionsWorkedTwoWeeks = sessionsWorkedTwoWeeks;
      $scope.tasksWorkedTwoWeeks = tasksWorkedTwoWeeks;
      
      $scope.statisticsMonthLabel = statisticsMonthLabel;
      $scope.hoursWorkedMonth = hoursWorkedMonth;
      $scope.sessionsWorkedMonth = sessionsWorkedMonth;
      $scope.tasksWorkedMonth = tasksWorkedMonth;
      $scope.$apply();
    });
  };
});
