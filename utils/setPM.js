const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');

module.exports = function(pid, uid) {
	return new Promise(async function(resolve, reject) {
		log.debug(`${pid} user ${uid} to set as PM`);
		sendRequest('PUT', {
			path: `/projects/${pid}/user_assignments/${uid}`,
			body: {
				user_assignment: {
					is_project_manager: true
				}
			}
		})
			.then(function() {
				log.debug(`${pid} user ${uid} set as PM`);
				resolve();
			})
			.catch(function(err) {
				log.warn(`${pid} user ${uid} failed to set as PM`);
				reject(err);
			});
	});
};
