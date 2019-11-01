const getPages = require('../actions/getPages.js'),
	log = require('../actions/logging.js');

module.exports = function(data) {
	log.info(`${data.client_name}: ${data.old_project.id} get tasks`);
	return new Promise(function(resolve, reject) {
		getPages(`projects/${data.old_project.id}/task_assignments`).then(function(
			tasks
		) {
			log.info(
				`${data.client_name}: ${data.old_project.id} received tasks`
			);
			data.tasks = tasks;
			resolve(data);
		});
	});
}; //getTasks
