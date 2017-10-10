process.env.NODE_ENV === 'dev';

var config = require('../config'),
	sendRequest = require('../actions/sendRequest'),
	moment = require('moment');

function callback(body) {
	console.log('Got projects now loop');
	//var projects = JSON.parse(body);
	body.forEach(function({ project }) {
		let PID = project.id;
		if (
			PID != config.harvest.default_project &&
			/(.+)\d{4}\-\d{2}$/.test(project.name) &&
			!!project.active
		) {
			console.log(`${PID} to be renamed.`);
			sendRequest('PUT', {
				path: `/projects/${PID}/`,
				body: {
					project: {
						name:
							project.name.match(/(.+)\d{4}\-\d{2}$/)[1] +
							moment()
								.subtract(2, 'months')
								.format('YYYY-MM'),
						client_id: project.client_id
					}
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
	sendRequest('GET', { path: '/projects' })
		.then(callback)
		.catch(function(reason) {
			console.log(`Failed: ${reason}`);
		});
}, 1500);
