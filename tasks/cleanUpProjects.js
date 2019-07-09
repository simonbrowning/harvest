const config = require("../config");
const sendRequest = require('../actions/sendRequest');
const getPages = require("../actions/getPages.js");
let clients = {};

console.log("getting projects...");
getPages("projects")
    .then(function(results) {
        console.log("Got projects now loop");
        results.forEach(function(project) {
            if (project.is_active && project.name.startsWith("Services")) {
                let notes;
                try {
                    notes = JSON.parse(project.notes);
                } catch (e) {
                    notes = {};
                }
                if (notes.client_bucket == "0") {
                    clients[project.client.name] = clients[project.client.name] || [];
                    clients[project.client.name].push(project);
                }
            }
        });
        for (const acc in clients) {
            if (clients.hasOwnProperty(acc)) {
                let client = clients[acc];
                if (client.length > 1) {
                    client.forEach(async function(project){
                        if (!project.budget_is_monthly) {
							console.log(`To be archived ${project.client.name} - ${project.id} - ${project.name}`);
							await sendRequest("PATCH", {
                    			path: `/projects/${project.id}`,
                    			form: {
                        			is_active: false
                    			}
                			});	
                        }
                    });
                }
                //console.log(acc,client)
            }
        }
        // console.log(JSON.stringify(clients));
        console.log("finished!");
    })
    .catch(function(reason) {
        console.error(reason);
    });