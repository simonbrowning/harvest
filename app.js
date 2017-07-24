//Load dependies
const r = require('request'),
  throttledRequest = require('throttled-request')(r),
  CronJob = require('cron').CronJob,
  _ = require("underscore"),
  fs = require("fs"),
  moment = require("moment"),
  SimpleNodeLogger = require('simple-node-logger');

//START configuration
const services_project_id = 14515764,
  last_month = moment().subtract(1, "month").format("YYYY-MM"),
  exclude_fields = [
    'active',
    'active_task_assignments_count',
    'active_user_assignments_count',
    'cache_version',
    'created_at',
    'earliest_record_at',
    'hint-earliest-record-at',
    'hint-latest-record-at',
    'id',
    'latest_record_at',
    'name',
    'updated_at'
  ];
let service_project,
  projects;
//Load previous client list from file
function loadFile(fileName) {
  const fileCheck = fs.existsSync(fileName);
  if (fileCheck) {
    let data = fs.readFileSync(fileName, 'utf8');

    if (data.length !== 0) {
      console.log(`read file, %s`, fileName);
      return JSON.parse(data);
    } else {
      return null;
    }
  } else {
    console.log('%s does not exist', fileName);
    return null;
  }
}

//load required files
const config = loadFile('config/config.json');
let oldClientList = loadFile('config/previousClients.js');

//setup logging
const log = SimpleNodeLogger.createRollingFileLogger(config.logger);

//configure request throttle
throttledRequest.configure({
  requests: 45,
  milliseconds: 7500
});
//END configuration

//function for sending requests
function sendRequest(method, options, cb) {
  return new Promise(function(resolve,reject){
    let data = "", response;
    if (!(_.has(options, "path")) || !method) {
        console.log("No path / method was set");
    }
    //Options for reqest
    const _options = {
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
    for (let key in options) {
        if (options.hasOwnProperty(key)) {
            if (key === "path") {
                _options.uri += options[key];
            } else {
                _options[key] = options[key];
            }
        }
    }
    console.log("API call: " + _options.uri);
    //Make request
    throttledRequest(_options)
      .on('response', function (resp) {
        response = resp;
        if(response.headers.status.indexOf("503") > -1){
          return reject("Message Throttled");

        }
      })
      .on('data',function(chunk){

        data +=chunk;
      })
      .on('end',function(){
          if(data === "" && method !== "GET"){
            resolve(response);
          }else {
            resolve(JSON.parse(data || '{}'));
          }
      })
  });
} //sendRequest

//get active clients
function getActiveClients(clients){
  let data = [];
  for (let i = 0; i < clients.length; i++) {
    if(clients[i].client.active === true){
      data.push(clients[i]);
    }
  }
  return data;
}

//check clients
function getNewClientIds(newList){
  //create array of all clientIDs from the returned list
  let currentClientIds = _.map(newList,function(content){
    return content.client.id;
  });
  //create an array of clientIDs from the 'old' list
  let oldClientIds = _.map(oldClientList,function(content){
    return content.client.id;
  });

  //retun the new clientIDs that are not present in the 'old list'
  return _.difference(currentClientIds,oldClientIds);
}

//find the support template object in returned project list
findTemplateProject(){
  service_project = _.find(projects,function(obj){
    if(obj.project.id === services_project_id){
      return obj.project;
    }
  })
}

//copy support project template to new client
function copyServicesProject(clientId){
  let updated_services_project = Object.assign({},service_project);
  updated_services_project.client_id = clientId;
  const new_project = {};
  new_project.name = updated_services_project.name.match(/(.+)\d{4}\-\d{2}$/)[1] + moment().format("YYYY-MM");
  new_project.active = true;
  exists = checkForNewProject(projects, clientId, new_project.name);
  if(exists){
    log.info(clientId+": Already has support project");
  }else{
    createProject(new_project,updated_services_project);
  }
}

//Different cron jobs merge
function createProject(new_project,old_project){
  cloneProject(old_project,new_project);
  createNewProject(old_project, new_project)
      .then(getUsers)
      .then(processUsers)
      .then(getTasks)
      .then(proccessTasks)
      .then(toggleOldProject)
      .catch(function(err) {
        log.warn(`Something bad happend, ${err}`);
      });
}

//clone project
function cloneProject(old_project, new_project) {
    //Clone project
    _.each(old_project, function(value, key, list) {
        if (_.has(list, key) && !exclude_fields.includes(key)) {
            new_project[key] = value;
        }
    });
}

//Create new project
function createNewProject(project, new_project) {
    return new Promise(function(resolve, reject) {
        log.info("Create new project");
        sendRequest("POST", {
                'path': "/projects",
                'body': {
                    'project': new_project
                }
            })
            .then(function(response){
              if(response.error){
                reject(response.error);
              }else{
                let new_pid = response.headers.location.match(/\d+/)[0];
                log.info("New project created: ", new_pid);
                log.info("Old project: ", project.id);
                resolve({
                    new_pid: new_pid,
                    old_pid: project.id
                });
              }
            })
    });
}//createNewProject

function addUser(project, user,userObj) {
        log.info("User to add: " +user.user.id);
        return new Promise(function(resolve, reject) {
            return sendRequest("POST", {
                    'path': "/projects/" + project + "/user_assignments",
                    'body': user
                })
                .then(function(response) {
                  let id = response.body.id;
                  log.info("Returned user ID: "+ id);
                    return updateUser(id,project,userObj)
                    .then(resolve);
                })
                .catch(function(err) {
                    return reject("Added user: " + err);
                });
        });
    }//addUser

function processUsers(data) {
    return new Promise(function(resolve, reject) {
        _.each(data.users, function copyUser(user) {
                addUser(data.new_pid, {'user': {'id': user.user_assignment.user_id}},user)
                    .then(function() {
                        log.info("User " + user.user_assignment.user_id + " added to " + data.new_pid);
                    });
            });
              return resolve(data);
        });
}//processUsers

function proccessTasks(data) {
    return new Promise(function(resolve, reject) {
        _.each(data.tasks, function copyTask(task) {
            log.info("Process task", task.task_assignment.task_id);
              addTask(data.new_pid, {'task': {'id': task.task_assignment.task_id}}, task)
                    .then(function() {
                        log.info("Task " + task.task_assignment.task_id + " added to " + data.new_pid);
                    });
            });
              return resolve(data);
            .catch(function(err) {
                reject("Proccess tasks: " + err);
            });
    });
}//proccessTasks

function addTask(project, task, old_task) {
        return new Promise(function(resolve, reject) {
            sendRequest("POST", {
                    'path': "/projects/" + project + "/task_assignments",
                    'body': task
                })
                .then(function(response) {
                    let tid = response.headers.location.match(/\d+$/)[0];
                    updateNewTask(tid, old_task, project)
                        .then(function() {
                            return resolve();
                        });
                })
                .catch(function(err) {
                    reject("Add task failed " + old_task + " : " + err);
                });
        });
    }//addTask

    function updateNewTask(tid, task, project) {
        log.info("Update task: " + tid);
        let task_update = {
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
    }//updateNewTask


function toggleOldProject(data) {
    return new Promise(function(resolve, reject) {
        if(data.old_pid !== services_project_id){
          log.info("Archiving: " + data.old_pid);
          sendRequest("PUT", {
                  'path': "/projects/" + data.old_pid + "/toggle"
              })
              .then(function(){
                log.info("Successfully archived: " + data.old_pid);
                resolve(data);
              });
    });
}//toggleOldProject

//Main function for clients
function proccessClients(clients){
  log.info("Received clients, processing");
  if(oldClientList === null){
    log.info("No previous clients, first run");
    oldClientList = [];
  }
  const activeClients = getActiveClients(clients);
  const newClientIds =  getNewClientIds(activeClients);

  sendRequest("GET,"{path:"/projects"})
  .then(function(returnedProjects){
    projects = returnedProjects;
    findTemplateProject();
    log.info(`Number of new clients to assign support project to ${newClientIds.length}`);
    _.each(newClientIds,copyServicesProject);
  })
}//proccessClients


//Get users for old project
function getUsers(data) {
    log.info("Fetch users");
    return new Promise(function(resolve, reject) {
        sendRequest("GET", {
                'path': "/projects/" + data.old_pid + "/user_assignments"
            })
            .then(function(users) {
                log.info("Received users");
                data.users = users;
                resolve(data);
            });
        });
}//getUsers

//Get tasks for old project
function getTasks(data) {
    log.info("Fetch Tasks");
    return new Promise(function(resolve, reject) {
        sendRequest("GET", {
                'path': "/projects/" + data.old_pid + "/task_assignments"
            })
            .then(function(tasks) {
                log.info("Received tasks");
                data.tasks = tasks;
                resolve(data);
            });
    });
}//getTasks


//cron job for monthly roll over
log.info("Setup rollover cronjob")
const monthlyRolloverJob = new CronJob('* * * 01 */1 *', function() {
  log.info("Monthly rollover triggered");

   sendRequest('GET',{path: '/projects'},processProjects);

  }, function () {
    /* This function is executed when the job stops */
    log.warn("monthlyRolloverJob stopped");
  },
  true /* Start the job right now */
);

//cron job for new client check every 5 minutes
log.info("Setup client cronjob")
const newClientCheckJob = new CronJob('00 */3 * * * *', function() {
  log.info("Client cron job triggered");
  console.log("get clients");
   sendRequest('GET',{path: '/clients'},proccessClients);

  }, function () {
    /* This function is executed when the job stops */
    log.warn("newClientCheckJob stopped");
  },
  true /* Start the job right now */
);
