var config = require('../config'),
	sendRequest = require('../actions/sendRequest');

function callback(body) {
	console.log('Got projects now loop');
	//var projects = JSON.parse(body);
	body.forEach(function({ project }) {
		let PID = project.id;
		if (
			PID != config.harvest.default_project &&
			/2017-10$/.test(project.name)
		) {
			console.log(`${PID} to be deleted.`);
			sendRequest('DELETE', { path: `/projects/${PID}/` })
				.then(function() {
					console.log(`${PID} deleted.`);
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
