(function() {
    'use strict';
    var r = require("request"),
        throttledRequest = require("throttled-request")(r),
        config = require("config"),
        _ = require("underscore"),
        moment = require("moment");

    //Setting Throttle Config for Harvest rate limiter
    throttledRequest.configure({
        requests: 70,
        milliseconds: 20000
    });

    var _last_month = moment().subtract(1, "month").format("YYYY-MM");
    var _exclude_fields = ['active_task_assignments_count', 'active_user_assignments_count', 'cache_version',
        'created_at', 'earliest_record_at', 'hint-earliest-record-at', 'hint-latest-record-at', 'id',
        'latest_record_at', 'name', 'updated_at'];

    function sendRequest(method, options) {
        return new Promise(function(resolve, reject) {
            if (!(_.has(options, "path")) || !method) {
                reject("No path / method was set");
            }
            //Options for reqest
            var _options = {
                method: method,
                uri: config.harvest.project_url,
                headers: {
                    'User-Agent': "node-harvest",
                    'Content-Type': "application/json",
                    'Accept': "application/json",
                    'Authorization': config.harvest.auth
                },
                json: true // Automatically parses the JSON string in the response
            };

            //Loop through and merge options
            for (var key in options) {
                if (options.hasOwnProperty(key)) {
                    if (key === "path") {
                        _options.uri += options[key];
                    } else {
                        _options[key] = options[key];
                    }
                }
            }
            console.log("API call: "+ _options.uri);
           //Make request
            throttledRequest(_options, function(err, resp, body) {
                if (err || !/^2\d{2}$/.test(resp.statusCode)) {
                  reject(body.message);
                } else{
                  if (resp.statusCode == 200) {
                    resolve(body);
                  } else if(resp.statusCode == 201){
                    resolve(resp);
                  }
                }
            });
        });
    }

    function createNewProject(project,new_project){
      return new Promise(function(resolve, reject) {
      console.log("createNewProject");
      return sendRequest("POST",{'path':"/projects",'body': {'project': new_project}})
        .then(function(response){
          var _new_pid = response.headers.location.match(/\d+/)[0];
          console.log("new project created",_new_pid);
          console.log("old project",project.id);
          return resolve({new_pid : _new_pid, old_pid : project.id});
        })
        .catch(function(err){
          reject("Create Project: "+err);
        });
      });
    }

    function getUsers(data) {
      console.log("getUsers");
      return new Promise(function(resolve, reject) {
        return  sendRequest("GET",{'path': "/projects/"+data.old_pid+"/user_assignments"})
        .then(function(users){
          console.log("received users");
          data.users = users;
          return resolve(data);
        })
        .catch(function(err){
          reject("Get Users: "+err);
        });
      });
    }

    function getTasks(data) {
      console.log("getTasks");
      return new Promise(function(resolve, reject) {
        return  sendRequest("GET",{'path':"/projects/"+data.old_pid+"/task_assignments"})
        .then(function(tasks){
          console.log("received tasks");
          data.tasks = tasks;
          return resolve(data);
        })
        .catch(function(err){
          reject("Get Tasks: "+err);
        });
      });
    }

    function addUser(project,user) {
      return new Promise(function(resolve, reject) {
        return  sendRequest("POST",{'path': "/projects/"+project+"/user_assignments",'body': user})
            .then(function() {
              return resolve();
            })
            .catch(function(err){
              reject("Add User: "+err);
            });
      });
    }

    function addTask(project,task,old_task) {
      return new Promise(function(resolve, reject) {
        return  sendRequest("POST",{'path': "/projects/"+project+"/task_assignments",'body': task})
            .then(function(response) {
              var tid = response.headers.location.match(/\d+$/)[0];
              return updateNewTask(tid,old_task,project);
            })
            .catch(function(err){
              reject("Add Task: "+err);
            });
      });
    }

    function updateNewTask(tid,task,project) {
      console.log("updateNewTask",tid);
      var task_update = {
          "task_assignment": {
            "budget": task.budet,
            "estimate": task.estimate
          }
        };
      return new Promise(function(resolve, reject) {
        return  sendRequest("PUT",{'path': "/projects/"+project+"/task_assignments/"+tid,'body': task_update})
            .then(function() {
              console.log("Task "+ tid+ " updated");
              return resolve();
            })
            .catch(function(err){
              reject("Update Task: "+err);
            });
      });
    }

    function tidyUp() {
      console.log("All done, toast is ready");
    }

    function toggleOldProject(data) {
      return new Promise(function(resolve, reject) {
        console.log("Archiving: "+ data.old_pid);
        return  sendRequest("PUT",{'path':  "/projects/" + data.old_pid + "/toggle"})
          .then(function(){
            console.log("Successfully archived: "+ data.old_pid);
            resolve(data);
          })
          .catch(function(err){
            reject("Toggle Project: "+err);
          });
      });
    }

    function errorHandle(err) {
      console.warn(">>>",err);
    }

    function  processUsers(data){
      return new Promise(function(resolve, reject) {
        var promise = Promise.resolve();
          _.each(data.users,function copyUser(user){
          console.log("user_id", user.user_assignment.user_id);
          promise = promise.then(function() {
            return addUser(data.new_pid,{'user': {'id': user.user_assignment.user_id}})
              .then(function(){
                console.log("user "+user.user_assignment.user_id+" added to "+ data.new_pid);
              });
            });
        });
        promise = promise.then(function(){
          return resolve(data);
        })
        .catch(function(err){
          reject("Proccess Users: "+err);
        });
      });
    }

    function proccessTasks(data) {
      return new Promise(function(resolve, reject) {
        var promise = Promise.resolve();
          _.each(data.tasks,function copyTask(task){
          console.log("task_id", task.task_assignment.task_id);
          promise = promise.then(function() {
            return addTask(data.new_pid,{'task': {'id': task.task_assignment.task_id}},task)
              .then(function(){
                console.log("Task "+task.task_assignment.task_id+" added to "+ data.new_pid);
              });
            });
        });
        promise = promise.then(function(){
          return resolve(data);
        })
        .catch(function(err){
          reject("Proccess Tasks: "+err);
        });
      });
    }

    function processProjects(projects){
      var promise = Promise.resolve();
        _.each(projects,function projectLoop(contents) {
          promise = promise.then(function() {
            var _project = contents.project, _pid, _new_project = {},_new_pid;
            //Check if project has a date YYYY-MM at the end of the project and is active
            if ((_.has(_project, "name") && _project.name.endsWith(_last_month)) && _project.active) {
                _pid = _project.id;
                console.log("Project to update: " + _pid);
                cloneProject(_project,_new_project);

                //Set new project name
                _new_project.name = _project.name.match(/(.+)\d{4}\-\d{2}$/)[1] + moment().format("YYYY-MM");
                return createNewProject(_project,_new_project)
                      .then(getUsers)
                      .then(processUsers)
                      .then(getTasks)
                      .then(proccessTasks)
                      .then(toggleOldProject)
                      .catch(function(err){
                        errorHandle(err);
                        //reject();
                      });
            }
        });
      });
      promise = promise.then(function() {
        tidyUp();
      })
      .catch(function(err){
        console.log("Proccess Project: "+err);
      });
    }

    function cloneProject(old_project,new_project){
      //Clone project
      _.each(old_project, function(value, key, list) {
          if (_.has(list, key) && !_exclude_fields.includes(key)) {
              new_project[key] = value;
          }
      });
    }


      console.log("Getting Projects");
      sendRequest("GET",{'path':"/projects"})
        .then(function result(response) {
          console.log("Received Project list, processing");
          processProjects(response);
        })
        .catch(function(err) {
          console.log("Could not get Projects ",err);
        });
}());
