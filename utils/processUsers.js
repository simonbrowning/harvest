const addUser = require('../utils/addUser.js'),
	setPM = require('../utils/setPM.js'),
	log = require('../actions/logging.js');

module.exports = function processUsers(data) {
	return new Promise(function(resolve, reject) {
		//console.log('data.users', data.users);
		let promises = data.users.map(function(user_assignment) {
			return new Promise(function(resolve, reject) {
				log.info(
<<<<<<< Updated upstream
					`${data.new_project.client
						.name}: ${data.new_pid} adding user ${user_assignment.user.name}`
=======
					`${data.old_project.client
						.name}: ${data.new_pid} adding user ${user_assignment.user_id}`
>>>>>>> Stashed changes
				);
				addUser(data.new_pid, user_assignment.user.id)
					.then(function(uid) {
						log.info(
<<<<<<< Updated upstream
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
=======
							`${data.old_project.client
								.name}: ${data.new_pid} user ${user_assignment.user_id} added: ${uid}`
						);

						log.info(
							`${data.old_project.client
								.name}: ${data.new_pid} checking to see if user ${user_assignment.user_id} (${uid}) is a PM`
						);
						if (!user_assignment.is_project_manager) {
							log.info(
								`${data.old_project.client
									.name}: ${data.new_pid} user ${user_assignment.user_id} (${uid}) not a PM`
>>>>>>> Stashed changes
							);
							resolve();
						} else {
							log.info(
<<<<<<< Updated upstream
								`${data.new_project.client
									.name}: ${data.new_pid} user ${user_assignment.user
									.name} (${uid}) is PM updating...`
=======
								`${data.old_project.client
									.name}: ${data.new_pid} user ${user_assignment.user_id} (${uid}) is PM updating...`
>>>>>>> Stashed changes
							);

							setPM(data.old_project.client_id, data.new_pid, uid)
								.then(function() {
									return resolve();
								})
								.catch(function(response) {
									log.warn(
<<<<<<< Updated upstream
										`${data.new_project.client
											.name}: ${data.new_pid} user ${user_assignment.user
											.name} (${uid}) failed to set as PM`
=======
										`${data.old_project.client
											.name}: ${data.new_pid} user ${uid} failed to set as PM`
>>>>>>> Stashed changes
									);
									console.error(response);
									return resolve();
								});
						}
					})
					.catch(function(e) {
						log.warn(
<<<<<<< Updated upstream
							`${data.new_project.client
								.name}: ${data.new_pid} user ${user_assignment.user
								.name} (${uid}) failed add`
=======
							`${data.old_project.client
								.name}: ${data.new_pid} user ${user_assignment.user_id} failed add`
>>>>>>> Stashed changes
						);
						resolve();
					});
			});
		});

		log.info(
<<<<<<< Updated upstream
			`${data.new_project.client
=======
			`${data.old_project.client
>>>>>>> Stashed changes
				.name}: ${data.new_pid} number of users to add ${data.users.length}`
		);
		Promise.all(promises)
			.then(function() {
				log.info(
<<<<<<< Updated upstream
					`${data.new_project.client
=======
					`${data.old_project.client
>>>>>>> Stashed changes
						.name}: ${data.new_pid} finished adding users`
				);
				resolve(data);
			})
			.catch(function(reason) {
				log.error(
<<<<<<< Updated upstream
					`${data.new_project.client
=======
					`${data.old_project.client
>>>>>>> Stashed changes
						.name}: ${data.new_pid} failed adding users: ${reason}`
				);
				reject(reason);
			});
	});
}; //processUsers
