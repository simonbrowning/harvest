(function() {
    'use strict';
    var r = require("request"),
        throttledRequest = require("throttled-request")(r),
        config = require("config"),
        _ = require("underscore"),
        moment = require("moment"),
        log = require('simple-node-logger').createRollingFileLogger(config.logger);
    //Setting Throttle Config for Harvest rate limiter
    throttledRequest.configure({
        requests: 70,
        milliseconds: 20000
    });
    var _last_month = moment().subtract(1, "month").format("YYYY-MM");
    var _exclude_fields = ['active_task_assignments_count', 'active_user_assignments_count', 'cache_version','created_at', 'earliest_record_at', 'hint-earliest-record-at', 'hint-latest-record-at', 'id','latest_record_at', 'name', 'updated_at'];
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
            log.info("API call: " + _options.uri);
            //Make request
            throttledRequest(_options, function(err, resp, body) {
                if (err || !/^2\d{2}$/.test(resp.statusCode)) {
                    reject(body.message);
                } else {
                    if (resp.statusCode == 200) {
                        resolve(body);
                    } else if (resp.statusCode == 201) {
                        resolve(resp);
                    }
                }
            });
        });
    }
    function createNewProject(project, new_project) {
        return new Promise(function(resolve, reject) {
            log.info("Create new project");
            return sendRequest("POST", {
                    'path': "/projects",
                    'body': {
                        'project': new_project
                    }
                })
                .then(function(response) {
                    var _new_pid = response.headers.location.match(/\d+/)[0];
                    log.info("New project created: ", _new_pid);
                    log.info("Old project: ", project.id);
                    return resolve({
                        new_pid: _new_pid,
                        old_pid: project.id
                    });
                })
                .catch(function(err) {
                    reject("Create project: " + err);
                });
        });
    }
    function checkForNewProject(projects, client_id, name) {
        log.info("Checking to see if project already exists");
        return _.find(projects, function(o) {
            return (o.project.client_id === client_id && o.project.name === name);
        });
    }
    function getUsers(data) {
        log.info("Fetch users");
        return new Promise(function(resolve, reject) {
            return sendRequest("GET", {
                    'path': "/projects/" + data.old_pid + "/user_assignments"
                })
                .then(function(users) {
                    log.info("Received users");
                    data.users = users;
                    return resolve(data);
                })
                .catch(function(err) {
                    reject("Get users: " + err);
                });
        });
    }
    function getTasks(data) {
        log.info("Fetch Tasks");
        return new Promise(function(resolve, reject) {
            return sendRequest("GET", {
                    'path': "/projects/" + data.old_pid + "/task_assignments"
                })
                .then(function(tasks) {
                    log.info("Received tasks");
                    data.tasks = tasks;
                    return resolve(data);
                })
                .catch(function(err) {
                    reject("Get tasks: " + err);
                });
        });
    }

    function updateUser(id,project,user){
      log.info("User to Update: ",user.user_assignment.id);
      log.info("User is Project Manager: ",(user.user_assignment.is_project_manager ? "true" : "false"));
      return new Promise(function(resolve,reject){
        return sendRequest("PUT", {
                'path': "/projects/" + project + "/user_assignments/"+id,
                'body': {
                  "user_assignment": {
                    "is_project_manager": user.user_assignment.is_project_manager
                  }
                }
            })
            .then(function(response){
              log.info("User updated: "+id);
              return resolve();
            })
            .catch(function(err){
              return reject("Update User: "+ err);
            });
      });
    }

    function addUser(project, user,userObj) {
        log.info("User to add: " +user.user.id);
        return new Promise(function(resolve, reject) {
            return sendRequest("POST", {
                    'path': "/projects/" + project + "/user_assignments",
                    'body': user
                })
                .then(function(response) {
                  var id = response.body.id;
                  log.info("Returned user ID: "+ id);
                    return updateUser(id,project,userObj)
                    .then(resolve);
                })
                .catch(function(err) {
                    return reject("Added user: " + err);
                });
        });
    }
    function addTask(project, task, old_task) {
        return new Promise(function(resolve, reject) {
            return sendRequest("POST", {
                    'path': "/projects/" + project + "/task_assignments",
                    'body': task
                })
                .then(function(response) {
                    var tid = response.headers.location.match(/\d+$/)[0];
                    updateNewTask(tid, old_task, project)
                        .then(function() {
                            return resolve();
                        });
                })
                .catch(function(err) {
                    reject("Add task failed " + old_task + " : " + err);
                });
        });
    }
    function updateNewTask(tid, task, project) {
        log.info("Update task: " + tid);
        var task_update = {
            "task_assignment": {
                "budget": task.task_assignment.budet,
                "estimate": task.task_assignment.estimate
            }
        };
        return new Promise(function(resolve, reject) {
            return sendRequest("PUT", {
                    'path': "/projects/" + project + "/task_assignments/" + tid,
                    'body': task_update
                })
                .then(function() {
                    log.info("Task " + tid + " updated");
                    return resolve();
                })
                .catch(function(err) {
                    reject("Update task " + tid + " failed: " + err);
                });
        });
    }
    function tidyUp() {
        log.info("All done, toast is ready");
    }
    function toggleOldProject(data) {
        return new Promise(function(resolve, reject) {
            log.info("Archiving: " + data.old_pid);
            return sendRequest("PUT", {
                    'path': "/projects/" + data.old_pid + "/toggle"
                })
                .then(function() {
                    log.info("Successfully archived: " + data.old_pid);
                    resolve(data);
                })
                .catch(function(err) {
                    reject("Toggle project: " + err);
                });
        });
    }
    function errorHandle(err) {
        log.warn(err);
    }
    function processUsers(data) {
        return new Promise(function(resolve, reject) {
            var promise = Promise.resolve();
            _.each(data.users, function copyUser(user) {
                promise = promise.then(function() {
                    return addUser(data.new_pid, {
                            'user': {
                                'id': user.user_assignment.user_id
                            }
                        },user)
                        .then(function() {
                            log.info("User " + user.user_assignment.user_id + " added to " + data.new_pid);
                        });
                });
            });
            promise = promise.then(function() {
                    return resolve(data);
                })
                .catch(function(err) {
                    reject("Process users: " + err);
                });
        });
    }
    function proccessTasks(data) {
        return new Promise(function(resolve, reject) {
            var promise = Promise.resolve();
            _.each(data.tasks, function copyTask(task) {
                log.info("Process task", task.task_assignment.task_id);
                promise = promise.then(function() {
                    return addTask(data.new_pid, {
                            'task': {
                                'id': task.task_assignment.task_id
                            }
                        }, task)
                        .then(function() {
                            log.info("Task " + task.task_assignment.task_id + " added to " + data.new_pid);
                        });
                });
            });
            promise = promise.then(function() {
                    return resolve(data);
                })
                .catch(function(err) {
                    reject("Proccess tasks: " + err);
                });
        });
    }
    function processProjects(projects) {
        var promise = Promise.resolve();
        _.each(projects, function projectLoop(contents) {
            promise = promise.then(function() {
                var _project = contents.project,
                    _pid, _new_project = {},
                    _new_pid, _exists;
                //Check if project has a date YYYY-MM at the end of the project and is active
                if ((_.has(_project, "name") && _project.name.endsWith(_last_month)) && _project.active) {
                    _pid = _project.id;
                    log.info("Project to process: " + _pid);
                    //Set new project name
                    _new_project.name = _project.name.match(/(.+)\d{4}\-\d{2}$/)[1] + moment().format("YYYY-MM");
                    _exists = checkForNewProject(projects, _project.client_id, _new_project.name);
                    if (_exists) {
                        log.info("New project already exists");
                        return false;
                    }
                    cloneProject(_project, _new_project);
                    return createNewProject(_project, _new_project)
                        .then(getUsers)
                        .then(processUsers)
                        .then(getTasks)
                        .then(proccessTasks)
                        .then(toggleOldProject)
                        .catch(function(err) {
                            errorHandle(err);
                        });
                }
            });
        });
        promise = promise.then(function() {
                tidyUp();
            })
            .catch(function(err) {
                log.info("Proccess project: " + err);
            });
    }
    function cloneProject(old_project, new_project) {
        //Clone project
        _.each(old_project, function(value, key, list) {
            if (_.has(list, key) && !_exclude_fields.includes(key)) {
                new_project[key] = value;
            }
        });
    }
    log.info("Getting projects");
    sendRequest("GET", {
            'path': "/projects"
        })
        .then(function result(response) {
            log.info("Received project list, processing");
            processProjects(response);
        })
        .catch(function(err) {
            log.error("Could not get Projects ", err);
            log.info("Exiting...");
        });
}());
