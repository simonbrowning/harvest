const addTask = require('../utils/addTask'),
	log = require('../actions/logging.js');

module.exports = function proccessTasks(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.tasks.map(function(task) {
			return new Promise(function(resolve, reject) {
				let tid = task.task.id;
				log.info(
					`${data.new_project.client.name}: ${data.new_pid} task ${task.task
						.name} to add`
				);
				addTask(data.new_pid, tid)
					.then(function() {
						log.info(
							`${data.new_project.client.name}: ${data.new_pid} task ${task.task
								.name} added`
						);
						resolve();
					})
					.catch(function(e) {
						log.warn(
							`${data.new_project.client.name}: ${data.new_pid} task ${task.task
								.name} failed`
						);
						resolve();
					});
			}).catch(function(reason) {
				log.error(
					`${data.new_project.client.name} failed to add ${task.task
						.name}: ${reason}`
				);
			});
		});

		Promise.all(promises)
			.then(function() {
				log.info(
					`${data.new_project.client
						.name}: ${data.new_pid} finished adding tasks`
				);
				resolve(data);
			})
			.catch(function(reason) {
				reject(reason);
			});
	});
}; //proccessTasks
