const sendRequest = require('../actions/sendRequest.js');
//Create new project
module.exports = function(project) {
	return new Promise(async function(resolve, reject) {
		let new_project;
		console.log('Create new project');
		try {
			new_project = await sendRequest('POST', {
				path: '/projects',
				body: {
					project: project
				}
			});
		} catch (e) {
			reject('failed to create project');
		}
		let new_pid = new_project.headers.location.match(/\d+/)[0];
		resolve(new_pid);
	});
};
