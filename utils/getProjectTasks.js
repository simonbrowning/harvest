const getPages = require('../actions/getPages.js'),
	log = require('../actions/logging.js');

module.exports = function(data) {
	log.debug(`${data.old_project.client_id}: ${data.old_project.id} get tasks`);
	return new Promise(function(resolve, reject) {
		getPages(`projects/${data.old_project.id}/task_assignments`).then(function(
			tasks
		) {
			log.debug(
				`${data.old_project.client_id}: ${data.old_project.id} recieved tasks`
			);
			data.tasks = tasks;
			resolve(data);
		});
	});
}; //getTasks
