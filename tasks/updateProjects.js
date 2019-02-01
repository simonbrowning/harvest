process.env.NODE_ENV === 'dev';

var config = require('../config'),
	getPages = require('../actions/getPages'),
	sendRequest = require('../actions/sendRequest'),
	moment = require('moment');

function callback(body) {
	console.log('Got projects now loop');
	//var projects = JSON.parse(body);
	body.forEach(function(project) {
		let PID = project.id;
		if (project.name === "Services - 2019-02" && project.is_active) {
			let notes = JSON.parse(project.notes);
			if (parseInt(notes.client_bucket) == 0) {
				console.log(project.client.name);
				sendRequest("PATCH", {
                    path: `/projects/${PID}/`,
                    form: {
                        is_active: false
                    }
                })
                    .then(function() {
                        console.log(`${PID}: ${project.client.name} updated.`);
                    })
                    .catch(function(reason) {
                        console.log(`${PID} failed, ${reason}`);
                    });
			}
            
		} else {
			if (project.name == "Services" && !project.budget_is_monthly) {
				console.log(project.client.name, project.id);
				sendRequest("PATCH", {
						path: `/projects/${PID}/`,
						form: {
							name: "Support"
						}
					})
						.then(function() {
							console.log(`${PID}: ${project.client.name} updated.`);
						})
						.catch(function(reason) {
							console.log(`${PID} failed, ${reason}`);
						});
				}
		}
	});
}
// console.log(config.harvest.project_url);
console.log('Get Projects');
setTimeout(function() {
	getPages('projects')
		.then(callback)
		.catch(function(reason) {
			console.log(`Failed: ${reason}`);
		});
}, 1500);
