const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');

module.exports = function(project, uid) {
	return new Promise(async function(resolve, reject) {
		log.info(`${project.client.name}: ${project.id} user ${uid} to be PM`);
		sendRequest('PATCH', {
			path: `/projects/${project.id}/user_assignments/${uid}`,
			body: {
				user_assignment: {
					is_project_manager: true
				}
			}
		})
			.then(function() {
				log.info(`${project.client.name}: ${project.id} user ${uid} set as PM`);
				resolve();
			})
			.catch(function(err) {
				log.warn(
					`${project.client
						.name}: ${project.id} user ${uid} failed to set as PM`
				);
				reject(err);
			});
	});
};
