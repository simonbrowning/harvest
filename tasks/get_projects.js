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
	body.forEach(function(Obj) {
		let PID = Obj.project.id;
		if (PID != config.harvest.default_project) {
			console.log(`${PID} to be get.`);
			sendRequest('GET', { path: `/projects/${PID}/` })
				.then(function({ project }) {
					console.log(`${PID} - ${project.id}`);
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
