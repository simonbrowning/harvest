const addTask = require('../utils/addTask'),
	log = require('../actions/logging.js');

module.exports = function proccessTasks(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.tasks.map(function(task) {
			return new Promise(function(resolve, reject) {
				let task_name =
					typeof task.task === 'object' ? task.task.name : task.name;
				let task_id = typeof task.task === 'object' ? task.task.id : task.id;
				log.info(
					`${data.new_project.client
						.name}: ${data.new_pid} task ${task_name} to add`
				);
				addTask(data.new_pid, task_id)
					.then(function() {
						log.info(
							`${data.new_project.client
								.name}: ${data.new_pid} task ${task_name} added`
						);
						resolve();
					})
					.catch(function(e) {
						log.warn(
							`${data.new_project.client
								.name}: ${data.new_pid} task ${task_name} failed`
						);
						resolve();
					});
			}).catch(function(reason) {
				log.error(
					`${data.client_name} failed to add task: ${reason}`
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
