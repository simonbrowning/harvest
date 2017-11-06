const sendRequest = require('../actions/sendRequest.js'),
	log = require('../actions/logging.js');
//Create new project
module.exports = function(data) {
	return new Promise(async function(resolve, reject) {
		let new_project;
		log.info('Create new project');
		try {
			new_project = await sendRequest('POST', {
				path: '/projects',
				form: data.new_project
			});
		} catch (e) {
			log.warn(` failed to create new project: ${e}`);
			reject(` failed to create new project: ${e}`);
		}
		try {
			data.new_project = await sendRequest('GET', {
				path: `/projects/${new_project}`
			});
			log.info(
				`${data.new_project.client
					.name}: ${new_project} new service project created`
			);
		} catch (e) {
			log.warn(`Failed to get project ${new_project}`);
		}
		data.new_pid = new_project;
		resolve(data);
	});
};
