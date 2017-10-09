const addUser = require('../utils/addUser.js'),
	setPM = require('../utils/setPM.js'),
	log = require('../actions/logging.js');

module.exports = function processUsers(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.users.map(function({ user_assignment }) {
			return new Promise(function(resolve, reject) {
				log.info(`${data.new_pid} user ${user_assignment.user_id} to add`);
				addUser(data.new_pid, user_assignment.user_id)
					.then(function(uid) {
						log.info(`${data.new_pid} user ${uid} added`);

						log.info(`${data.new_pid} checking to see if user ${uid} is a PM`);
						if (!user_assignment.is_project_manager) {
							log.info(`${data.new_pid} user ${uid} not a PM`);
							resolve();
						} else {
							log.info(`${data.new_pid} user ${uid} is PM updating...`);

							setPM(data.new_pid, uid)
								.then(function() {
									return resolve();
								})
								.catch(function(response) {
									log.warn(`${data.new_pid} user ${uid} failed to set as PM`);
									console.error(response);
									return resolve();
								});
						}
					})
					.catch(function(e) {
						log.warn(
							`${data.new_pid} user ${user_assignment.user_id} failed add`
						);
						resolve();
					});
			});
		});

		Promise.all(promises)
			.then(function() {
				log.info(`${data.new_pid} finished adding users`);
				resolve(data);
			})
			.catch(function(reason) {
				log.error(`${data.new_pid} failed adding users: ${reason}`);
				reject(reason);
			});
	});
}; //processUsers
