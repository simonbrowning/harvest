const addTask = require('../utils/addTask');

module.exports = function proccessTasks(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.tasks.map(function({ task_assignment }) {
			return new Promise(function(resolve, reject) {
				console.log('Process task: ', task_assignment.task_id);
				addTask(data.new_pid, task_assignment.task_id)
					.then(function() {
						console.log(
							`Task ${task_assignment.task_id} added to ${data.new_pid}`
						);
						resolve();
					})
					.catch(function() {
						console.error(
							`failed to add ${task_assignment.task_id} to ${data.new_pid}`
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