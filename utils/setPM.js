const sendRequest = require('../actions/sendRequest.js');

module.exports = function(id, project, user) {
	return new Promise(async function(resolve, reject) {
		console.log('PM to update: ', user.id);
		sendRequest('PUT', {
			path: '/projects/' + project + '/user_assignments/' + id,
			body: {
				user_assignment: {
					is_project_manager: user.is_project_manager
				}
			}
		})
			.then(function() {
				console.log('User updated to PM: ' + id);
				resolve();
			})
			.catch(function(err) {
				reject(`failed to set ${user.id} as PM`);
			});
	});
};
