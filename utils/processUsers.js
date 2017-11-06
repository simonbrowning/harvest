const addUser = require('../utils/addUser.js'),
	setPM = require('../utils/setPM.js'),
	log = require('../actions/logging.js');

module.exports = function processUsers(data) {
	return new Promise(function(resolve, reject) {
		//console.log('data.users', data.users);
		let promises = data.users.map(function(user_assignment) {
			return new Promise(function(resolve, reject) {
				log.info(
					`${data.new_project.client
						.name}: ${data.new_pid} adding user ${user_assignment.user.name}`
				);
				addUser(data.new_pid, user_assignment.user.id)
					.then(function(uid) {
						log.info(
							`${data.new_project.client
								.name}: ${data.new_pid} user ${user_assignment.user
								.name} added: ${uid}`
						);

						log.info(
							`${data.new_project.client
								.name}: ${data.new_pid} checking to see if user ${user_assignment
								.user.name} (${uid}) is a PM`
						);
						if (!user_assignment.is_project_manager) {
							log.info(
								`${data.new_project.client
									.name}: ${data.new_pid} user ${user_assignment.user
									.name} (${uid}) not a PM`
							);
							resolve();
						} else {
							log.info(
								`${data.new_project.client
									.name}: ${data.new_pid} user ${user_assignment.user
									.name} (${uid}) is PM updating...`
							);

							setPM(data.old_project.client_id, data.new_pid, uid)
								.then(function() {
									return resolve();
								})
								.catch(function(response) {
									log.warn(
										`${data.new_project.client
											.name}: ${data.new_pid} user ${user_assignment.user
											.name} (${uid}) failed to set as PM`
									);
									console.error(response);
									return resolve();
								});
						}
					})
					.catch(function(e) {
						log.warn(
							`${data.new_project.client
								.name}: ${data.new_pid} user ${user_assignment.user
								.name} (${uid}) failed add`
						);
						resolve();
					});
			});
		});

		log.info(
			`${data.new_project.client
				.name}: ${data.new_pid} number of users to add ${data.users.length}`
		);
		Promise.all(promises)
			.then(function() {
				log.info(
					`${data.new_project.client
						.name}: ${data.new_pid} finished adding users`
				);
				resolve(data);
			})
			.catch(function(reason) {
				log.error(
					`${data.new_project.client
						.name}: ${data.new_pid} failed adding users: ${reason}`
				);
				reject(reason);
			});
	});
}; //processUsers
