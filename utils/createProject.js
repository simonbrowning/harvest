const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');
//Create new project
module.exports = function(data) {
	return new Promise(async function(resolve, reject) {
		let new_project;
		log.debug('Create new project');
		try {
			new_project = await sendRequest('POST', {
				path: '/projects',
				body: {
					project: data.new_project
				}
			});
		} catch (e) {
			log.error(`failed to create new project: ${e}`);
			reject('failed to create project');
		}
		log.debug(`${new_project} created`);
		data.new_pid = new_project;
		resolve(data);
	});
};
