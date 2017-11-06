const getPages = require('../actions/getPages.js'),
	log = require('../actions/logging.js');

module.exports = function(data) {
<<<<<<< Updated upstream
	log.info(
		`${data.new_project.client.name}: ${data.old_project.id} get tasks`
=======
	log.debug(
		`${data.old_project.client.name}: ${data.old_project.id} get tasks`
>>>>>>> Stashed changes
	);
	return new Promise(function(resolve, reject) {
		getPages(`projects/${data.old_project.id}/task_assignments`).then(function(
			tasks
		) {
<<<<<<< Updated upstream
			log.info(
				`${data.new_project.client.name}: ${data.old_project.id} recieved tasks`
=======
			log.debug(
				`${data.old_project.client.name}: ${data.old_project.id} recieved tasks`
>>>>>>> Stashed changes
			);
			data.tasks = tasks;
			resolve(data);
		});
	});
}; //getTasks
