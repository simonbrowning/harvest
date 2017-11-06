const addTask = require('../utils/addTask'),
	log = require('../actions/logging.js');

module.exports = function proccessTasks(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.tasks.map(function(task) {
			return new Promise(function(resolve, reject) {
				let tid = task.task && task.task.id ? task.task.id : task.id;
				log.info(
<<<<<<< Updated upstream
					`${data.new_project.client.name}: ${data.new_pid} task ${tid} to add`
=======
					`${data.old_project.client.name}: ${data.new_pid} task ${tid} to add`
>>>>>>> Stashed changes
				);
				addTask(data.new_pid, tid)
					.then(function() {
						log.info(
<<<<<<< Updated upstream
							`${data.new_project.client
=======
							`${data.old_project.client
>>>>>>> Stashed changes
								.name}: ${data.new_pid} task ${tid} added`
						);
						resolve();
					})
					.catch(function(e) {
						log.warn(
<<<<<<< Updated upstream
							`${data.new_project.client
								.name}: ${data.new_pid} task ${tid} failed`
=======
							`${data.old_project.client
								.name}: ${data.new_pid} task ${tid} failed.`
>>>>>>> Stashed changes
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
