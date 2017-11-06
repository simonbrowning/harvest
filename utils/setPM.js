const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');

module.exports = function(client_id, pid, uid) {
	return new Promise(async function(resolve, reject) {
		log.info(`${client_id}: ${pid} user ${uid} to set as PM`);
		sendRequest('PATCH', {
			path: `/projects/${pid}/user_assignments/${uid}`,
			body: {
				user_assignment: {
					is_project_manager: true
				}
			}
		})
			.then(function() {
				log.info(`${client_id}: ${pid} user ${uid} set as PM`);
				resolve();
			})
			.catch(function(err) {
				log.warn(`${client_id}: ${pid} user ${uid} failed to set as PM`);
				reject(err);
			});
	});
};
