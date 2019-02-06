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
		if (
            project.name === "Services" &&
            !project.is_active &&
			project.starts_on === "2019-01-01"
        ) {
			console.log(project.client.name);
                sendRequest("PATCH", {
                    path: `/projects/${PID}/`,
                    form: {
                        is_active: true
                    }
                })
                    .then(function() {
                        console.log(`${PID}: ${project.client.name} updated.`);
                    })
                    .catch(function(reason) {
                        console.log(`${PID} failed, ${reason}`);
                    });
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
