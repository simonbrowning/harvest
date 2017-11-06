const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');

module.exports = function(data) {
	return new Promise(function(resolve, reject) {
		sendRequest('GET', {
			path: `/projects/${data.old_project.id}/user_assignments`
		}).then(function(users) {
			log.info(
				`${data.old_project.client_id}: ${data.old_project.id} recieved tasks`
			);
			data.users = users.user_assignments;
			resolve(data);
		});
	});
};
