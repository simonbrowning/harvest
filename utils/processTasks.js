const addTask = require('../utils/addTask');

module.exports = function proccessTasks(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.tasks.map(function(obj) {
			return new Promise(function(resolve, reject) {
				let task = obj.task_assignment || obj.task;
				let tid = task.task_id || task.id;
				console.log('Process task: ', tid);
				addTask(data.new_pid, tid)
					.then(function() {
						console.log(`Task ${tid} added to ${data.new_pid}`);
						resolve();
					})
					.catch(function() {
						console.error(`failed to add ${tid} to ${data.new_pid}`);
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
