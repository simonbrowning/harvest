const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');

module.exports = function(pid, task) {
	return new Promise(async function(resolve, reject) {
		let new_task;
		try {
			new_task = await sendRequest('POST', {
				path: `/projects/${pid}/task_assignments`,
				form: { task_id: task }
			});
		} catch (e) {
			reject('failed to add task');
		}
		let tid = new_task;
		resolve(tid);
	});
}; //addTask
