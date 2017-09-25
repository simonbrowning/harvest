const sendRequest = require('../actions/sendRequest');

module.exports = function(data) {
	console.log('Fetch Tasks');
	return new Promise(function(resolve, reject) {
		sendRequest('GET', {
			path: `/projects/${data.old_project.id}/task_assignments`
		}).then(function(tasks) {
			console.log('Received tasks');
			data.tasks = tasks;
			resolve(data);
		});
	});
}; //getTasks
