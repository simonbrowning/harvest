const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');

module.exports = function(pid, user) {
	return new Promise(async function(resolve, reject) {

		try {
            console.log(`/projects/${pid}/user_assignments/${user}`);
			await sendRequest('DELETE', {
				path: `/projects/${pid}/user_assignments/${user}`
			});
		} catch (e) {
			reject('failed to add user');
		}
		resolve();
	});
};
