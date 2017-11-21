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
<<<<<<< HEAD
		if (
			PID != config.harvest.default_project &&
			project.name === 'Services - 2017-12' &&
			!!project.active
		) {
=======
		if (PID != config.harvest.default_project && project.name === 'Services - 2017-11' && project.is_active) {
>>>>>>> harvest-api-v2
			console.log(`${PID} to be renamed.`);
			sendRequest('PATCH', {
				path: `/projects/${PID}/`,
<<<<<<< HEAD
				body: {
					project: {
						name: 'Services - 2017-10',
						client_id: project.client_id
					}
=======
				form: {
					name: 'Support - 2017-10'
					//is_active: true
>>>>>>> harvest-api-v2
				}
			})
				.then(function() {
					console.log(`${PID} renamed.`);
				})
				.catch(function(reason) {
					console.log(`${PID} failed, ${reason}`);
				});
		}
	});
}
console.log(config.harvest.project_url);
console.log('Get Projects');
setTimeout(function() {
	getPages('projects')
		.then(callback)
		.catch(function(reason) {
			console.log(`Failed: ${reason}`);
		});
}, 1500);
