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
		if (PID != config.harvest.default_project && project.name === 'Services - 2017-11') {
			console.log(`${PID} to be updated.`);

			let notes = `{${project.notes.replace(/\;/g, ',').replace(/([A-z_ ]+)/g, '"$1"')}}`;
			try {
				JSON.parse(notes);

				sendRequest('PATCH', {
					path: `/projects/${PID}/`,
					form: {
						notes: notes
					}
				})
					.then(function() {
						console.log(`${PID} updated.`);
					})
					.catch(function(reason) {
						console.log(`${PID} failed, ${reason}`);
					});
			} catch (e) {
				console.log(`${project.cleint.name} failed to parse notes skipping: ${e}`);
			}
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
