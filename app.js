(function() {
        'use strict';
        var request = require("request"),
        throttledRequest = require("throttled-request")(request),
        config = require("config"),
        _ = require("underscore"),
        moment = require("moment");

        throttledRequest.configure({
          requests: 100,
          milliseconds: 15000
        });



        var last_month = moment().subtract(1, "month").format("YYYY-MM");
        var exclude_fields = ['active_task_assignments_count', 'active_user_assignments_count', 'cache_version',
            'created_at', 'earliest_record_at', 'hint-earliest-record-at', 'hint-latest-record-at', 'id',
            'latest_record_at', 'name', 'updated_at'
        ];
        var headers = {
            'User-Agent': "node-harvest",
            'Content-Type': "application/json",
            'Accept': "application/json",
            'Authorization': config.harvest.auth
        };
        var options = {
            'headers': headers,
            'url': config.harvest.project_url
        };

        //Get list of all active projects in Harvest
        throttledRequest(options, function(error, response, body) {
            //Check for errors
            if (!error && response.statusCode == 200) {
                //Convert response body to JSON from a string
                var json_body = JSON.parse(body),
                    project, pid, new_project = {};
                    //Loop through all projects
                    _.each(json_body, function(contents) {
                        project = contents.project;
                        //Check if project has a date YYYY-MM at the end of the project and is active
                        if ((_.has(project, "name") && project.name.endsWith(last_month)) && !!project.active) {
                            pid = project.id;
                            console.log("Project to update: " + pid + " - " + project.name);

                            //Clone project
                            _.each(project, function(value, key, list) {
                                if (_.has(list, key) && !exclude_fields.includes(key)) {
                                    new_project[key] = value;
                                }
                            });
                            //console.log("new_project",new_project);

                            //Give new name to project
                            new_project.name = project.name.match(/(.+)\d{4}\-\d{2}$/)[1] + moment().format("YYYY-MM");
                            console.log("New Project Name: " + new_project.name);
                            var options = {
                                'method': "POST",
                                'headers': headers,
                                'url': config.harvest.project_url,
                                'body': JSON.stringify({
                                    'project': new_project
                                })
                            };

                            //Create new project
                            throttledRequest(options, function(error, response, body) {
                                if (!error && response && response.statusCode == 201) {
                                    console.log(">>>New Project Created");
                                    console.log(response.headers.location);
                                    var new_pid = response.headers.location.match(/\d+/)[0];

                                    //user assignment
                                    var options = {
                                        'headers': headers,
                                        'url': config.harvest.project_url + "/" + pid + "/user_assignments"
                                    };
                                    //Get attached users to old project
                                    throttledRequest(options, function(error, response, body) {
                                        if (!error && response.statusCode == 200) {
                                            var users = JSON.parse(body);
                                            console.log(">>>Start user copying");
                                            //loop through and add them to new project
                                            for (var i = 0; users.length > i; i++) {
                                                var user = users[i];
                                                console.log("user_id", user.user_assignment.user_id);
                                                var new_user = {
                                                    'user': {
                                                        'id': user.user_assignment.user_id,
                                                    }
                                                };

                                                var options = {
                                                    'method': "POST",
                                                    'headers': headers,
                                                    'url': ""+config.harvest.project_url + "/" + new_pid + "/user_assignments",
                                                    'body': JSON.stringify(new_user)
                                                };

                                                //Send request to add user to new project
                                                throttledRequest(options, function(error, response, body) {
                                                    if (error || (response && response.statusCode !== 201)) {
                                                        console.log("Could not add user: ", error);
                                                    } else {
                                                        console.log("User Added: ",body);
                                                    }
                                                });
                                            } //For Loop
                                        } else {
                                            console.error(response.statusCode);
                                            console.error(body);
                                        }
                                    });

                                    //task assignment
                                    var options = {
                                      'headers': headers,
                                      'url': config.harvest.project_url+"/"+pid+"/task_assignments"
                                    };
                                    //Get attached users to old project
                                    throttledRequest(options,function(error, response, body){
                                      if (!error && response.statusCode == 200) {
                                      var tasks = JSON.parse(body);
                                      //loop through and add them to new project
                                      console.log(">>>Start migrating tasks");
                                      for (var i=0;tasks.length > i;i++) {
                                        var task = tasks[i];
                                          var new_task = {
                                            'task':{
                                              'id': task.task_assignment.task_id,
                                            }
                                          };

                                          var options = {
                                            'method': "POST",
                                            'headers': headers,
                                            'url': config.harvest.project_url+"/"+new_pid+"/task_assignments",
                                            'body': JSON.stringify(new_task)
                                          };
                                          //Send request to add user to new project
                                          throttledRequest(options,function(error,response,body){
                                              if(error || (response && response.statusCode !== 201)){
                                                console.log("Could not add task: ",error);
                                              }else{
                                                console.log(">>>Task Added: ",body);
                                              }
                                          });
                                      } //For Loop

                                } else {
                                    console.error(response.statusCode);
                                    console.error(body);
                                }
                            });

                        } else {
                            console.error(response.statusCode);
                            console.error(body);
                        }
                    });

                    //Toggle
                    options = {
                        'method': "PUT",
                        'headers': headers,
                        'url': config.harvest.project_url + "/" + pid + "/toggle"
                    };

                    throttledRequest(options, function(error, response, body) {
                        console.log("Disabling project: " + pid);
                        if (error || (response && response.statusCode !== 200)) {
                            console.log("Couldn't disable project: " + pid);
                        }else{
                          console.log("Project disabled: " + pid);
                        }
                    });
                }
            });
        }
        });
}());
