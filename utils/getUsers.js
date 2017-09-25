const sendRequest = require('../actions/sendRequest');

module.exports= getUsers(data) {
	console.log('Fetch users');
	return new Promise(function(resolve, reject) {
		sendRequest('GET', {
			path: `/projects/${data.old_project.project.id}/user_assignments`
		}).then(function(users) {
			console.log('Received users');
			data.users = users;
			resolve(data);
		});
	});
} //getUsers
