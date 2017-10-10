var r = require('request'),
	throttledRequest = require('throttled-request')(r),
	config = require('../config'),
	sendRequest = require('../actions/sendRequest');

// throttledRequest.on('request', function () {
//   console.log('Making a request. Elapsed time: %d ms', Date.now() - startedAt);
// });

function callback(body) {
	console.log('Got projects now loop');
	//var projects = JSON.parse(body);
	body.forEach(function({ project }) {
		let PID = project.id;
		if (
			project.id != config.harvest.default_project &&
			/2017-10$/.test(project.name)
		) {
			console.log(`checking ${PID}`);
			if (project.notify_when_over_budget) {
				console.log(`${PID} has emails configured`);
			} else {
				console.log(`${PID} currently set to no emails... updating `);
				sendRequest('PUT', {
					path: `/projects/${PID}`,
					body: {
						project: {
							client_id: project.client_id,
							notify_when_over_budget: true
						}
					}
				})
					.then(function({ project }) {
						console.log(`${PID} updated`);
					})
					.catch(function(reason) {
						console.error(`${PID} failed - ${reason}`);
						process.exit(1);
					});
			}
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
