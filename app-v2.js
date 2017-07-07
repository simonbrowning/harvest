//script to continue running with PM2
const r = require('request'),
  throttledRequest = require('throttled-request')(r),
  config = require("config"),
  CronJob = require('cron').CronJob,
    _ = require("underscore");

//load stored client list or defualt to empty array.
let oldClientList = [];

//setup logging with winston logger

//configure request throttle
throttledRequest.configure({
  requests: 40,
  milliseconds: 7500
});


//function for sending requests
function sendRequest(method, options) {
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

//copy support project template to new client
function copySupportProject(clientId){
 console.log(clientId);
}

//proccess returned clients
function proccessClients(error, response, body) {
 if (error && response.statusCode !== 200) {
   console.warn("Failed to get clients");

 }else {

   console.log(new Date());
   console.log(`
     Old client list length:   ${oldClientList.length}
     New client list length:   ${body.length}`);
   //check to see if oldClientList is populated
   if(oldClientList.length === 0){
     oldClientList = body;

   }else{

     let newClientIds =  getNewClientIds(body);
     console.log(`new clients to assign support project to ${newClientIds.join(",")}`);

     _.each(newClientIds,addSupportProject);

   }
 }
}



//cron job for monthly roll over
const job = new CronJob('00 */1 * * * *', function() {
  throttledRequest(sendRequest('/clients'),callback);

  }, function () {
    /* This function is executed when the job stops */
    console.log("job stopped");
  },
  true /* Start the job right now */
  //timeZone /* Time zone of this job. */
);

//cron job for new client check every 5 minutes
const job = new CronJob('00 */1 * * * *', function() {
  throttledRequest(sendRequest('/clients'),proccessClients);

  }, function () {
    /* This function is executed when the job stops */
    console.log("job stopped");
  },
  true /* Start the job right now */
  //timeZone /* Time zone of this job. */
);
