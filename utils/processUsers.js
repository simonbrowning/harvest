const addUser = require('../utils/addUser.js'),
	setPM = require('../utils/setPM.js');

module.exports = function processUsers(data) {
	return new Promise(function(resolve, reject) {
		let promises = data.users.map(function({ user_assignment }) {
			return new Promise(function(resolve, reject) {
				addUser(data.new_pid, user_assignment.user_id)
					.then(function() {
						console.log(
							`'User ${user_assignment.user_id} added to ${data.new_pid}`
						);
						console.log(`checking to see if ${user_assignment.user_id} is PM`);
						if (!user_assignment.is_project_manager) {
							console.log(`${user_assignment.user_id} is not a PM`);
							resolve();
						} else {
							console.log(`${user_assignment.user_id} is PM updating...`);
							setPM(data.new_pid, user_assignment.user_id)
								.then(function() {
									return resolve();
								})
								.catch(function(response) {
									console.error(
										`failed to set ${user_assignment.user_id} as PM`
									);
									console.error(response);
									return resolve();
								});
						}
					})
					.catch(function(e) {
						console.error(
							`failed to add ${user_assignment.user_id} to ${data.new_pid}`
						);
						resolve();
					});
			});
		});

		Promise.all(promises)
			.then(function() {
				console.log(`finished adding users to ${data.new_pid}`);
				resolve(data);
			})
			.catch(function(reason) {
				console.log(`failed to add all users to ${data.new_pid}`);
				console.error(reason);
				reject(reason);
			});
	});
}; //processUsers
