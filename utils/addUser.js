const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');

module.exports = function(pid, user, pm) {
	return new Promise(async function(resolve, reject) {
		let new_user;
		console.log(JSON.stringify({
			user_id: user,
			is_project_manager: (pm != undefined ? pm : false)
		}))
		try {
			new_user = await sendRequest('POST', {
				path: `/projects/${pid}/user_assignments/`,
				form: {
					user_id: user,
					is_project_manager: (pm != undefined ? pm : false)
				}
			});
		} catch (e) {
			reject('failed to add user');
		}
		resolve(new_user);
	});
};
