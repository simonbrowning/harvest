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
		if (PID != config.harvest.default_project && project.name === 'Services - 2018-01') {
			//console.log(`${PID} to be checked.`);

			try {
				let notes = JSON.parse(project.notes);
				if (!notes.account_manager) {
					console.log(`${project.client.name} - ${PID}: No Account Manager Set`);
				}

				// sendRequest('PATCH', {
				// 	path: `/projects/${PID}/`,
				// 	form: {
				// 		notes: notes
				// 	}
				// })
				// 	.then(function() {
				// 		console.log(`${PID} updated.`);
				// 	})
				// 	.catch(function(reason) {
				// 		console.log(`${PID} failed, ${reason}`);
				// 	});
			} catch (e) {
				console.log(`${project.client.name} - ${PID}: NOT a JSON object`);
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
