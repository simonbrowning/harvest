const addTask = require('../utils/addTask'),
	log = require('../actions/logging.js');

module.exports = function proccessTasks(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.tasks.map(function(task) {
			return new Promise(function(resolve, reject) {
				let tid = task.task && task.task.id ? task.task.id : task.id;
				log.info(
					`${data.new_project.client.name}: ${data.new_pid} task ${tid} to add`
				);
				addTask(data.new_pid, tid)
					.then(function() {
						log.info(
							`${data.new_project.client
								.name}: ${data.new_pid} task ${tid} added`
						);
						resolve();
					})
					.catch(function(e) {
						log.warn(
							`${data.new_project.client
								.name}: ${data.new_pid} task ${tid} failed`
						);
						resolve();
					});
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
