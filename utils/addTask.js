const sendRequest = require('../actions/sendRequest.js');

module.exports = function(pid, task) {
	return new Promise(async function(resolve, reject) {
		let new_task;
		console.log(`create new task for ${pid}`);
		try {
			new_task = await sendRequest('POST', {
				path: '/projects/' + pid + '/task_assignments',
				body: {
					task: {
						id: task_assignment.task_id
					}
				}
			});
		} catch (e) {
			reject('failed to create task');
		}
		let tid = new_task.headers.location.match(/\d+$/)[0];
		resolve(tid);
	});
}; //addTask
