const sendRequest = require('../actions/sendRequest.js');

module.exports = function(pid, uid) {
	return new Promise(async function(resolve, reject) {
		console.log('PM to update: ', uid);
		sendRequest('PUT', {
			path: `/projects/${pid}/user_assignments/${uid}`,
			body: {
				user_assignment: {
					is_project_manager: true
				}
			}
		})
			.then(function() {
				console.log('User set to PM: ' + id);
				resolve();
			})
			.catch(function(err) {
				reject(err);
			});
	});
};
