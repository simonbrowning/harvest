const sendRequest = require('../actions/sendRequest.js');

module.exports = function(pid, user, userObj) {
	return new Promise(async function(resolve, reject) {
		let new_user;
		console.log('User to add: ' + user.user.id);
		try {
			new_user = await sendRequest('POST', {
				path: '/projects/' + pid + '/user_assignments',
				body: user
			});
		} catch (e) {
			reject('failed to add user');
		}
		resolve(new_user.headers.location.match(/\d+$/)[0]);
	});
};
