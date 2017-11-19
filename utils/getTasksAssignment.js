const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');

module.exports = function(data) {
	return new Promise(function(resolve, reject) {
		log.info(`${data.old_project.client.name}: ${data.old_project.id} getting old tasks`);
		sendRequest('GET', {
			path: `/projects/${data.old_project.id}/task_assignments`
		}).then(function(tasks) {
			log.info(`${data.old_project.client.name}: ${data.old_project.id} received tasks`);
			data.tasks = tasks.task_assignments;
			resolve(data);
		});
	});
};
