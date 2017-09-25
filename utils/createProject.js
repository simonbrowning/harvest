const sendRequest = require('../actions/sendRequest.js');
//Create new project
module.exports = function(data) {
	return new Promise(async function(resolve, reject) {
		let new_project;
		console.log('Create new project');
		try {
			new_project = await sendRequest('POST', {
				path: '/projects',
				body: {
					project: data.new_project
				}
			});
		} catch (e) {
			reject('failed to create project');
		}
		data.new_pid = new_project;
		resolve(data);
	});
};
