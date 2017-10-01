var config = require('../config'),
	sendRequest = require('../actions/sendRequest'),
	toggleProject = require('../utils/toggleProject');

function callback(body) {
	console.log('Got projects now loop');
	//var projects = JSON.parse(body);
	body.forEach(function({ project }) {
		let PID = project.id;
		if (
			PID != config.harvest.default_project &&
			/2017-09$/.test(project.name) &&
			project.active === true
		) {
			console.log(`${PID} to be toggled.`);
			toggleProject({ old_project: project })
				.then(function() {
					console.log(`${PID} toggled.`);
				})
				.catch(function(reason) {
					console.log(`${PID} failed, ${reason}`);
				});
		}
	});
}
console.log(config.harvest.project_url);
console.log('Get Projects');
sendRequest('GET', { path: '/projects' })
	.then(callback)
	.catch(function(reason) {
		console.log(`Failed: ${reason}`);
	});
