const sendRequest = require('../actions/sendRequest');

module.exports = function(data) {
	log.info('Fetch Tasks');
	return new Promise(function(resolve, reject) {
		sendRequest('GET', {
			path: `/projects/${data.old_project.project.id}/task_assignments`
		}).then(function(tasks) {
			log.info('Received tasks');
			data.tasks = tasks;
			resolve(data);
		});
	});
}; //getTasks
