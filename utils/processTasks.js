const addTask = require('../utils/addTask'),
	log = require('../actions/logging.js');

module.exports = function proccessTasks(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.tasks.map(function(obj) {
			return new Promise(function(resolve, reject) {
				let task = obj.task_assignment || obj.task;
				let tid = task.task_id || task.id;
				log.info(
					`${data.old_project.client_id}: ${data.new_pid} task ${tid} to add`
				);
				addTask(data.new_pid, tid)
					.then(function() {
						log.info(`${data.new_pid} task ${tid} added`);
						resolve();
					})
					.catch(function(e) {
						log.warn(
							`${data.old_project
								.client_id}: ${data.new_pid} task ${tid} failed.`
						);
						resolve();
					});
			});
		});

		Promise.all(promises)
			.then(function() {
				resolve(data);
			})
			.catch(function(reason) {
				reject(reason);
			});
	});
}; //proccessTasks
